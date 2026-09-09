"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const { execFile } = require("child_process");
const { URL } = require("url");
const { anthropicToOpenAI, openAIToAnthropic } = require("./convert.cjs");
const { StreamConverter } = require("./stream.cjs");
const { randomUUID } = require("crypto");

// 프록시 인스턴스 세션 ID — 서버 인스턴스 수명 동안 안정적 (생성자에서 1회 생성).
// 세션 라우팅을 도입한 공급자(opencode Console Go 등)는 x-opencode-session 헤더가
// 없는 요청을 400(MissingSessionID)으로 거부한다. 공식 문서 요구는 "대화별 안정적
// 세션 ID를 헤더로 전송"뿐이고 형식은 클라이언트 생성(세션 생성 API 없음)이므로,
// 요청마다 무작위 ID를 보내는 것보다 서버 수명 동안 고정 ID가 라우팅·캐싱에 유리하다.
// 모듈 상수가 아닌 인스턴스 필드인 이유: 한 프로세스에 여러 프록시(프로필)가 뜰 수
// 있으므로 서로 다른 세션으로 구분하는 편이 안전하다. unrecognized header이므로
// 다른 공급자에는 무해하다.

const BACKUP_FILE = path.join(os.homedir(), ".claude-api-manager", "proxy-settings-backup.json");
// 디버그 로그 기본 경로. options.debugLogFile > env CAM_DEBUG_LOG_FILE > 기본 순으로
// 오버라이드 (테스트/병렬 실행이 실제 사용자의 로그를 덮어쓰지 않도록).
const DEBUG_LOG_DEFAULT = path.join(os.homedir(), ".claude-api-manager", "proxy-debug.log");
function resolveDebugLogFile(optPath) {
  return path.resolve(optPath || process.env.CAM_DEBUG_LOG_FILE || DEBUG_LOG_DEFAULT);
}
const MAX_DEBUG_LOGS = 100;

// 세션 헤더 on/off 파싱: true/1/on/yes → 켜기, false/0/off/no → 끄기, 그 외 기본값
function parseSessionHeader(raw, defaultVal = true) {
  if (raw === null || raw === undefined || raw === "") return defaultVal;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (["1", "true", "on", "yes", "enable", "enabled"].includes(s)) return true;
  if (["0", "false", "off", "no", "disable", "disabled"].includes(s)) return false;
  return defaultVal;
}
function parseRateLimit(raw) {
  if (raw === null || raw === undefined) return { mode: "off", value: 0 };
  const s = String(raw).trim().toLowerCase();
  if (s === "auto") return { mode: "auto", value: 0 };
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n > 0) return { mode: "static", value: n };
  return { mode: "off", value: 0 };
}

// 로컬 포트가 살아있는지 (프록시 실행 여부 판단용)
function isPortOpen(port, host = "127.0.0.1", timeout = 300) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(timeout);
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("timeout", () => {
      sock.destroy();
      resolve(false);
    });
    sock.once("error", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, host);
  });
}

// ── 포트 점유 감지/정리 (Windows: netstat/tasklist, Unix: lsof) ──────

function findPidOnPort(port) {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "netstat" : "lsof";
    const args = isWin ? ["-ano", "-p", "tcp"] : ["-i", `:${port}`, "-sTCP:LISTEN", "-t"];
    execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve([]);
      const pids = [];
      for (const line of String(stdout).split(/\r?\n/)) {
        if (!line.includes(`:${port}`)) continue;
        if (isWin) {
          if (!line.includes("LISTENING")) continue;
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) pids.push(parseInt(pid, 10));
        } else {
          const pid = line.trim();
          if (/^\d+$/.test(pid)) pids.push(parseInt(pid, 10));
        }
      }
      resolve([...new Set(pids)]);
    });
  });
}

function getProcessName(pid) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve("");
    execFile(
      "tasklist",
      ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) return resolve("");
        const m = String(stdout).match(/"([^"]+)"/);
        resolve(m ? m[1] : "");
      }
    );
  });
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

/**
 * OpenAI 호환 API 프록시 서버
 * Claude Code → (Anthropic 형식) → 프록시 → (OpenAI 형식 변환) → /v1/chat/completions
 * Anthropic 방식 공급자는 settings.json에 직접 설정하면 되므로 proxy 불필요
 */
class ProxyServer {
  constructor(options = {}) {
    this.port = options.port || 3456;
    this.targetUrl = options.targetUrl || "";
    this.apiKey = options.apiKey || "";
    this.model = options.model || "";
    // 분류기 전용 공급자 (미설정 시 메인 공급자와 동일)
    this.classifierTargetUrl = options.classifierTargetUrl || "";
    this.classifierApiKey = options.classifierApiKey || "";
    this.classifierModel = options.classifierModel || "";
    this.profileName = options.profileName || "";
    // x-opencode-session 헤더 on/off — 기본 켜짐.
    // 우선순위: options.sessionHeader > env CAM_SESSION_HEADER > 기본(true).
    // byNara 등 엄격 게이트웨이는 미인식 헤더를 400으로 거부하므로 off 필요.
    this.sessionHeaderEnabled = parseSessionHeader(
      options.sessionHeader !== undefined ? options.sessionHeader : process.env.CAM_SESSION_HEADER,
      true
    );
    // 이 인스턴스의 세션 헤더 값 (서버 수명 동안 고정)
    this.sessionId = `cam-${randomUUID()}`;
    this.manager = options.manager || null;
    this.server = null;
    this.running = false;
    this.settingsBackup = null;
    this.usage = { inputTokens: 0, outputTokens: 0, requests: 0 };
    // 레이트 리밋 모드:
    //   "off"    = 무제한 (0 또는 미설정)
    //   "static" = 고정 한도 (숫자 N: 슬라이딩 윈도우 N/분)
    //   "auto"   = AIMD 적응형 ("auto": 무제한 시작, 429 시 감속, 안정화 시 증속)
    const rl = parseRateLimit(options.rateLimit);
    this.rateMode = rl.mode;
    this.rateLimit = rl.value; // static 모드의 고정 한도
    this.rateCeiling = rl.mode === "auto" ? 240 : Infinity; // auto 모드 회복 상한
    this.adaptiveLimit = Infinity; // auto 모드 현재 한도 (시작=무제한)
    this.requestTimestamps = []; // 슬라이딩 윈도우용 타임스탬프
    this.lastEffectiveLimit = Infinity; // 마지막 throttle 판정에 쓴 한도 (로그용)
    this.last429At = 0;
    this.lastDecreaseAt = 0;
    this.lastIncreaseAt = Date.now();
    this.decreaseCooldownMs = Number.isFinite(options.decreaseCooldownMs) ? options.decreaseCooldownMs : 5000;
    this.stableMs = Number.isFinite(options.stableMs) ? options.stableMs : 90000;
    this.increaseIntervalMs = Number.isFinite(options.increaseIntervalMs) ? options.increaseIntervalMs : 20000;
    this.debug = !!options.debug;
    this.debugLogs = [];
    // 디버그 로그 경로: options.debugLogFile > CAM_DEBUG_LOG_FILE env > 기본(홈)
    this.debugLogFile = resolveDebugLogFile(options.debugLogFile);
    // 로그 파일 초기화 (시작 시 새로 시작)
    try {
      fs.mkdirSync(path.dirname(this.debugLogFile), { recursive: true });
      fs.writeFileSync(this.debugLogFile, `=== proxy debug log started ${new Date().toISOString()} ===\n`, "utf-8");
    } catch {}
  }

  // 디버그 로그: 항상 수집(메모리+파일), --debug 또는 TUI 디버그 창일 때 화면 출력
  log(...args) {
    const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
    this.debugLogs.push(line);
    if (this.debugLogs.length > MAX_DEBUG_LOGS) {
      this.debugLogs.shift();
    }
    try {
      fs.appendFileSync(this.debugLogFile, line + "\n", "utf-8");
    } catch {}
    if (this.debug) {
      console.error(line);
    }
  }

  // 토큰 사용량 누적 (Anthropic 기준 input/output)
  addUsage(inputTokens, outputTokens) {
    if (Number.isFinite(inputTokens)) this.usage.inputTokens += inputTokens;
    if (Number.isFinite(outputTokens)) this.usage.outputTokens += outputTokens;
    this.usage.requests += 1;
  }

  // 레이트 리밋 (슬라이딩 윈도우).
  //   off    = 무제한
  //   static = 고정 한도 N/분 초과 시 공급자 전송 전까지 지연
  //   auto   = AIMD 적응형: 무제한 시작, upstream 429 시 절반씩 축소,
  //            안정화되면 서서히 증가해 최적값을 찾음 (상한 240/분)
  async throttle() {
    if (this.rateMode === "off") {
      this.log("RATE LIMIT: off (unlimited)");
      return;
    }
    const windowMs = 60000;
    const tag = this.rateMode === "auto" ? "RATE LIMIT AUTO" : "RATE LIMIT";
    while (true) {
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < windowMs);
      const limit =
        this.rateMode === "auto"
          ? Number.isFinite(this.adaptiveLimit)
            ? Math.min(this.rateCeiling, this.adaptiveLimit)
            : Infinity
          : this.rateLimit;
      this.lastEffectiveLimit = limit;
      if (!Number.isFinite(limit)) {
        this.log(`${tag}: unlimited, window=${this.requestTimestamps.length}`);
        this.requestTimestamps.push(Date.now());
        return;
      }
      this.log(`${tag}: window=${this.requestTimestamps.length}/${limit} per min`);
      if (this.requestTimestamps.length < limit) {
        this.requestTimestamps.push(Date.now());
        return;
      }
      const oldest = this.requestTimestamps[0];
      const waitMs = Math.max(0, oldest + windowMs - now) + 5;
      this.log(`${tag}: THROTTLING ${waitMs}ms (${limit}/min) before sending to upstream`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  // TUI/디버그에서 현재 레이트 리밋 상태를 표시하기 위한 스냅샷
  getRateLimitInfo() {
    const effective =
      this.rateMode === "off"
        ? null
        : this.rateMode === "auto"
          ? Number.isFinite(this.adaptiveLimit)
            ? Math.min(this.rateCeiling, this.adaptiveLimit)
            : null
          : this.rateLimit;
    return {
      mode: this.rateMode, // off | static | auto
      limit: effective, // 현재 유효 한도 (null=무제한), 분당
      ceiling: this.rateCeiling,
      adaptive: this.adaptiveLimit, // auto 모드 내부값 (Infinity 가능)
      window: this.requestTimestamps.length,
    };
  }

  // upstream 응답 상태에 따라 적응형 한도 조절 (auto 모드 전용, sync/stream 양쪽에서 호출)
  noteUpstreamStatus(statusCode) {
    if (this.rateMode !== "auto") return;
    if (statusCode === 429) {
      this.onRateLimited();
    } else if (statusCode < 400) {
      this.onSuccess();
    }
  }

  // 429 수신: 곱셈 감소 (한도 절반). 동시 다발 429는 쿨다운으로 1회만 감축.
  onRateLimited() {
    const now = Date.now();
    if (now - this.lastDecreaseAt < this.decreaseCooldownMs) {
      this.log("RATE LIMIT AUTO: 429 received (decrease cooldown, skip)");
      return;
    }
    this.lastDecreaseAt = now;
    this.last429At = now;
    this.lastIncreaseAt = now;
    const prev = this.adaptiveLimit;
    if (!Number.isFinite(prev)) {
      // 무제한 학습 중 첫 429: 직전 1분 창의 절반에서 시작
      const recent = Math.max(1, this.requestTimestamps.length);
      this.adaptiveLimit = Math.max(1, Math.floor(recent / 2));
    } else {
      this.adaptiveLimit = Math.max(1, Math.floor(prev / 2));
    }
    this.log(`RATE LIMIT AUTO: 429 -> limit ${prev} -> ${this.adaptiveLimit}/min`);
  }

  // 성공 응답: 안정화 후 덧셈 증가 (+최대 10%/20초, ceiling까지)
  onSuccess() {
    if (!Number.isFinite(this.adaptiveLimit)) return;
    if (this.adaptiveLimit >= this.rateCeiling) return;
    const now = Date.now();
    if (now - this.last429At < this.stableMs) return;
    if (now - this.lastIncreaseAt < this.increaseIntervalMs) return;
    const prev = this.adaptiveLimit;
    const step = Math.max(1, Math.floor(prev * 0.1));
    this.adaptiveLimit = Math.min(this.rateCeiling, prev + step);
    this.lastIncreaseAt = now;
    this.log(
      `RATE LIMIT AUTO: stable ${Math.round((now - this.last429At) / 1000)}s -> limit ${prev} -> ${this.adaptiveLimit}/min`
    );
  }

  start() {
    return new Promise((resolve, reject) => {
      // 포트 점유 시 EADDRINUSE를 그대로 전달 (자동 포트 이동 없음 —
      // 조용한 이동은 백그라운드 서버 누적의 원인. 사용자에게 명확한 에러 안내)
      const srv = http.createServer((req, res) => this.handleRequest(req, res));
      srv.on("error", (err) => {
        reject(err);
      });
      srv.listen(this.port, () => {
        this.server = srv;
        this.port = srv.address().port;
        this.running = true;
        // listen 성공 후에만 settings.json 반영 (실패 시 잔여 설정 방지)
        if (this.manager) {
          this.applyProxySettings();
        }
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.running = false;
          // settings.json 원상복구
          if (this.manager && this.settingsBackup) {
            this.restoreSettings();
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  applyProxySettings() {
    const current = this.manager.readSettings() || {};
    // 복원 기준 = 현재 settings.env (사용자의 수동 수정 보존).
    // 현재 settings가 이미 프록시 주소(127.0.0.1)면 이전 크래시 잔여물이므로
    // 활성 프로필 env로 대체 (의미없는 백업 방지)
    let originalEnv = null;
    if (
      current.env &&
      !String(current.env.ANTHROPIC_BASE_URL || "").startsWith("http://127.0.0.1")
    ) {
      originalEnv = { ...current.env };
    } else {
      try {
        const activeName = this.manager.getActiveProfileName();
        if (activeName) {
          const p = this.manager.getProfile(activeName);
          if (p && p.env && Object.keys(p.env).length > 0) {
            originalEnv = { ...p.env };
          }
        }
      } catch {}
    }
    // 현재 env 백업 (메모리 + 디스크)
    this.settingsBackup = {
      env: originalEnv || {},
      model: current.model || null,
    };
    try {
      fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(this.settingsBackup), "utf-8");
    } catch {}

    // 프록시 설정 적용
    const newEnv = { ...(current.env || {}) };
    newEnv.ANTHROPIC_BASE_URL = `http://127.0.0.1:${this.port}`;

    // Claude Code가 로그인 상태로 인식하도록 Bearer 토큰 설정
    // (공식 문서: 게이트웨이 크레덴셜은 ANTHROPIC_AUTH_TOKEN 사용 권장,
    //  즉시 우선 적용되며 일회성 승인 불필요. API_KEY는 대화형 승인 필요)
    if (this.apiKey) {
      newEnv.ANTHROPIC_AUTH_TOKEN = this.apiKey;
      delete newEnv.ANTHROPIC_API_KEY;
    }

    current.env = newEnv;
    this.manager.writeSettings(current);
  }

  restoreSettings() {
    const current = this.manager.readSettings() || {};
    const curBase =
      current.env && current.env.ANTHROPIC_BASE_URL
        ? String(current.env.ANTHROPIC_BASE_URL)
        : "";
    // 현재 설정이 이 프록시를 가리키고 있을 때만 복원.
    // 다른 프록시 인스턴스가 나중에 settings.json을 덮어썼다면 건드리지 않음
    if (!curBase.startsWith(`http://127.0.0.1:${this.port}`)) {
      this.settingsBackup = null;
      try {
        fs.unlinkSync(BACKUP_FILE);
      } catch {}
      return;
    }
    if (this.settingsBackup.env) {
      current.env = this.settingsBackup.env;
    } else {
      delete current.env;
    }
    if (this.settingsBackup.model) {
      current.model = this.settingsBackup.model;
    } else {
      delete current.model;
    }
    this.manager.writeSettings(current);
    this.settingsBackup = null;
    try {
      fs.unlinkSync(BACKUP_FILE);
    } catch {}
  }

  // 프로세스 급작 종료 등으로 남은 백업을 감지해 settings.json 복원.
  // 단, settings.json이 살아있는 프록시(127.0.0.1:PORT)를 가리키면 실행 중인
  // 프록시의 백업이므로 복원하지 않음 (다른 cam 명령 실행으로 프록시 설정이
  // 풀리는 문제 방지)
  static async restoreFromDisk(manager) {
    if (!fs.existsSync(BACKUP_FILE)) return false;
    try {
      const current = manager.readSettings() || {};
      const curBase =
        current.env && current.env.ANTHROPIC_BASE_URL
          ? String(current.env.ANTHROPIC_BASE_URL)
          : "";
      const curMatch = curBase.match(/^http:\/\/127\.0\.0\.1:(\d+)/);
      if (curMatch && (await isPortOpen(parseInt(curMatch[1], 10)))) {
        return false;
      }
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
      // 백업이 없거나 프록시 주소면 활성 프로필 env로 복원
      let env = backup.env;
      const baseUrl = env && env.ANTHROPIC_BASE_URL ? String(env.ANTHROPIC_BASE_URL) : "";
      if (!env || baseUrl.startsWith("http://127.0.0.1")) {
        try {
          const activeName = manager.getActiveProfileName();
          if (activeName) {
            const p = manager.getProfile(activeName);
            if (p && p.env && Object.keys(p.env).length > 0) env = { ...p.env };
          }
        } catch {}
      }
      if (env && Object.keys(env).length > 0) {
        current.env = env;
      } else {
        delete current.env;
      }
      if (backup.model) {
        current.model = backup.model;
      } else {
        delete current.model;
      }
      manager.writeSettings(current);
      fs.unlinkSync(BACKUP_FILE);
      return true;
    } catch {
      return false;
    }
  }

  async handleRequest(req, res) {
    // 헤더 설정
    res.setHeader("Content-Type", "application/json");

    // Health check
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok", profile: this.profileName }));
      return;
    }

    // Claude Code 연결 확인용 (HEAD /api/hello)
    if (req.method === "HEAD" && req.url === "/api/hello") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end();
      return;
    }

    // 모델 목록
    if (req.method === "GET" && req.url === "/v1/models") {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          data: [{ id: this.model || "proxy-model", object: "model" }],
        })
      );
      return;
    }

    // Anthropic Messages 엔드포인트 (쿼리스트링 포함: /v1/messages?beta=true)
    if (req.method === "POST" && req.url.split("?")[0] === "/v1/messages") {
      try {
        const body = await this.readBody(req);
        this.log(`REQ ${req.method} ${req.url} model=${JSON.stringify(body.model)} stream=${!!body.stream} messages=${(body.messages || []).length}`);
        await this.handleMessages(body, req, res);
      } catch (err) {
        console.error(`[proxy] Error: ${err.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ type: "error", error: { type: "server_error", message: err.message } }));
      }
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ type: "error", error: { type: "not_found", message: "Not found" } }));
  }

  readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(new Error("Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  }

  // Claude Code 자동 승인 분류기 요청 감지:
  // auto 모드에서 안전성 판단용으로 claude-sonnet-*[1m], muse-spark-*[1m] 같은
  // 분류기 모델을 호출하는데, upstream이 이 모델을 모르면 실패하므로 프로필 모델로 치환.
  // 분류기 전용 공급자가 설정된 경우, 메인 모델과 동일해도 작은 요청은 분류기로 간주해 전용 공급자로 라우팅.
  isClassifierRequest(model, body) {
    if (!model) return false;
    const m = String(model).toLowerCase();
    const isClassifierModel = m.includes("sonnet") || m.includes("haiku") || m.includes("spark");
    if (!isClassifierModel) return false;
    if (this.model && m === String(this.model).toLowerCase()) {
      // 메인 모델과 동일: 분류기 전용 설정(모델 또는 URL)이 있고, 작은 요청일 때만 분류기로 간주
      if (!this.classifierTargetUrl && !this.classifierModel) return false;
      const msgCount = body && Array.isArray(body.messages) ? body.messages.length : 0;
      // stream=false + messages<=5 인 sync 분류기 요청을 별도 라우팅
      if (msgCount > 5) return false;
    }
    return true;
  }

  // ── 전문 비교용 상세 로그 (proxy vs node 직접전송) ─────────────
  //민감값(API키)은 마스킹. outbound 전문은 파일로 덤프해 node 재전송 가능하게 함.
  summarizeBody(seq, body, openaiRequest, targetUrl, headers) {
    try {
      const inboundKeys = body ? Object.keys(body) : [];
      const inTools = Array.isArray(body?.tools) ? body.tools : [];
      const inToolNames = inTools.map((t) => t?.name || "?");
      const inToolSchemaBytes = inTools.map((t) => {
        try { return JSON.stringify(t?.input_schema || {}).length; } catch { return -1; }
      });
      const inMsgs = Array.isArray(body?.messages) ? body.messages : [];
      const inMsgSummary = inMsgs.map((m) => {
        const c = m?.content;
        if (typeof c === "string") return `${m?.role}:str:${c.length}`;
        if (Array.isArray(c)) {
          const types = c.map((b) => b?.type || "?").join(",");
          let len = 0;
          try { len = JSON.stringify(c).length; } catch {}
          return `${m?.role}:[${types}]:${len}B`;
        }
        return `${m?.role}:?`;
      });
      let systemInfo = "none";
      if (typeof body?.system === "string") systemInfo = `str:${body.system.length}`;
      else if (Array.isArray(body?.system)) {
        let len = 0;
        try { len = JSON.stringify(body.system).length; } catch {}
        systemInfo = `arr:${body.system.length}:${len}B`;
      } else if (body?.system) systemInfo = typeof body.system;

      const outTools = Array.isArray(openaiRequest?.tools) ? openaiRequest.tools : [];
      const outToolNames = outTools.map((t) => t?.function?.name || t?.name || "?");
      const outParamBytes = outTools.map((t) => {
        try { return JSON.stringify(t?.function?.parameters || {}).length; } catch { return -1; }
      });
      const outMsgs = Array.isArray(openaiRequest?.messages) ? openaiRequest.messages : [];
      const outMsgSummary = outMsgs.map((m) => {
        const c = m?.content;
        const clen = typeof c === "string" ? c.length : (c ? JSON.stringify(c).length : 0);
        const extra = [];
        if (m?.tool_calls) extra.push(`tool_calls=${m.tool_calls.length}`);
        if (m?.reasoning_content) extra.push(`reasoning=${String(m.reasoning_content).length}`);
        return `${m?.role}:${clen}B${extra.length ? `(${extra.join(",")})` : ""}`;
      });
      // ── Artifact 내부 구조 분석 (거부 원인 bisect용) ──
      // 의심 키워드: $schema / prefixItems / additionalProperties 객체형 /
      // propertyNames / anyOf+const / pattern / type 배열 등 strict validator 거부 후보.
      // IN(input_schema)과 OUT(parameters) 양쪽을 대조해 변환 과정에서
      // 키가 그대로 전달되는지 확인한다.
      const SUSPICIOUS_KEYS = ["$schema", "prefixItems", "additionalProperties", "propertyNames", "anyOf", "const", "pattern", "if", "then", "else", "not", "contains", "unevaluatedProperties", "unevaluatedItems", "dependentSchemas"];
      const collectKeyHits = (schema) => {
        const hits = {};
        const seen = new Set();
        const walk = (node, depth) => {
          if (!node || typeof node !== "object" || depth > 8 || seen.has(node)) return;
          seen.add(node);
          if (Array.isArray(node)) {
            for (const v of node) walk(v, depth + 1);
            return;
          }
          for (const k of Object.keys(node)) {
            if (SUSPICIOUS_KEYS.includes(k)) {
              const v = node[k];
              const vType = Array.isArray(v) ? `arr:${v.length}` : typeof v;
              hits[k] = hits[k] ? `${hits[k]},${vType}` : vType;
            }
            walk(node[k], depth + 1);
          }
        };
        walk(schema, 0);
        return hits;
      };
      // ── Artifact 내부 구조 where/ctx 추적 (depth 6, 상위 20/5개) ──
      const collectArtifactLocs = (schema) => {
        const where = [];
        const ctx = [];
        const seen = new Set();
        const walk = (node, curPath, depth) => {
          if (!node || typeof node !== "object" || depth > 6 || seen.has(node)) return;
          seen.add(node);
          if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) walk(node[i], `${curPath}[${i}]`, depth + 1);
            return;
          }
          for (const k of Object.keys(node)) {
            const p = curPath ? `${curPath}.${k}` : k;
            if (SUSPICIOUS_KEYS.includes(k)) {
              if (where.length < 20) where.push(p);
              if (ctx.length < 5) {
                let vstr = "";
                try { vstr = JSON.stringify(node[k]); } catch { vstr = String(node[k]); }
                ctx.push(`${p}=${vstr.slice(0, 120)}`);
              }
            }
            walk(node[k], p, depth + 1);
          }
        };
        walk(schema, "", 0);
        return { where, ctx };
      };
      let inBytes = 0, outBytes = 0;
      try { inBytes = JSON.stringify(body).length; } catch {}
      try { outBytes = JSON.stringify(openaiRequest).length; } catch {}
      // ── Artifact 대상 추출 + collectKeyHits 실제 호출 ──
      try {
        const inArt = inTools.find((t) => t && t.name === "Artifact");
        const outArt = outTools.find((t) => (t?.function?.name || t?.name) === "Artifact");
        const inSchema = inArt ? (inArt.input_schema || {}) : null;
        const outSchema = outArt ? (outArt.function?.parameters || outArt.parameters || {}) : null;
        if (inSchema || outSchema) {
          const inHits = inSchema ? collectKeyHits(inSchema) : {};
          const outHits = outSchema ? collectKeyHits(outSchema) : {};
          const inLocs = inSchema ? collectArtifactLocs(inSchema) : { where: [], ctx: [] };
          const outLocs = outSchema ? collectArtifactLocs(outSchema) : { where: [], ctx: [] };
          const inKeys = inSchema ? Object.keys(inSchema) : [];
          const outKeys = outSchema ? Object.keys(outSchema) : [];
          const inProps = inSchema && inSchema.properties ? Object.keys(inSchema.properties) : [];
          const outProps = outSchema && outSchema.properties ? Object.keys(outSchema.properties) : [];
          const inReq = Array.isArray(inSchema?.required) ? inSchema.required : [];
          const outReq = Array.isArray(outSchema?.required) ? outSchema.required : [];
          let inArtBytes = 0, outArtBytes = 0;
          try { inArtBytes = inSchema ? JSON.stringify(inSchema).length : 0; } catch {}
          try { outArtBytes = outSchema ? JSON.stringify(outSchema).length : 0; } catch {}
          this.log(`[req ${seq}] ART keys IN=[${inKeys.join(",")}] OUT=[${outKeys.join(",")}]`);
          this.log(`[req ${seq}] ART props IN=[${inProps.join(",")}] OUT=[${outProps.join(",")}]`);
          this.log(`[req ${seq}] ART required IN=[${inReq.join(",")}] OUT=[${outReq.join(",")}]`);
          this.log(`[req ${seq}] ART flags IN=${JSON.stringify(inHits)} OUT=${JSON.stringify(outHits)}`);
          this.log(`[req ${seq}] ART where IN=[${inLocs.where.join(",")}] OUT=[${outLocs.where.join(",")}]`);
          this.log(`[req ${seq}] ART ctx IN=[${inLocs.ctx.join(" | ")}] OUT=[${outLocs.ctx.join(" | ")}]`);
          this.log(`[req ${seq}] ART bytes IN=${inArtBytes} OUT=${outArtBytes}`);
        } else {
          this.log(`[req ${seq}] ART none (no Artifact tool in IN/OUT)`);
        }
      } catch (e) {
        this.log(`[req ${seq}] ART summarize failed: ${e.message}`);
      }

      this.log(`[req ${seq}] IN keys=[${inboundKeys.join(",")}] ${inBytes}B model=${body?.model} stream=${!!body?.stream} max_tokens=${body?.max_tokens} temp=${body?.temperature} stop=${JSON.stringify(body?.stop_sequences || null)} tool_choice=${JSON.stringify(body?.tool_choice || null)}`);
      this.log(`[req ${seq}] IN system=${systemInfo} messages=${inMsgs.length} [${inMsgSummary.join(" | ")}]`);
      this.log(`[req ${seq}] IN tools=${inTools.length} [${inToolNames.join(",")}] schemaB=[${inToolSchemaBytes.join(",")}]`);
      this.log(`[req ${seq}] IN extras metadata=${body?.metadata ? JSON.stringify(body.metadata).slice(0, 200) : "none"} thinking=${body?.thinking ? JSON.stringify(body.thinking).slice(0, 200) : "none"} output_config=${body?.output_config ? JSON.stringify(body.output_config).slice(0, 200) : "none"} context_management=${body?.context_management ? JSON.stringify(body.context_management).slice(0, 200) : "none"}`);
      const safeHeaders = { ...(headers || {}) };
      if (safeHeaders.Authorization) safeHeaders.Authorization = "Bearer ***";
      if (safeHeaders.authorization) safeHeaders.authorization = "***";
      this.log(`[req ${seq}] OUT url=${targetUrl} ${outBytes}B model=${openaiRequest?.model} stream=${!!openaiRequest?.stream} max_tokens=${openaiRequest?.max_tokens} temp=${openaiRequest?.temperature} stop=${JSON.stringify(openaiRequest?.stop || null)} tool_choice=${JSON.stringify(openaiRequest?.tool_choice || null)} headers=${JSON.stringify(safeHeaders)}`);
      this.log(`[req ${seq}] OUT messages=${outMsgs.length} [${outMsgSummary.join(" | ")}]`);
      this.log(`[req ${seq}] OUT tools=${outTools.length} [${outToolNames.join(",")}] paramB=[${outParamBytes.join(",")}]`);
      // outbound 전문 파일 덤프 (node 재전송용)
      try {
        const dumpPath = path.join(path.dirname(this.debugLogFile), `cam-outbound-${seq}-${Date.now()}.json`);
        fs.writeFileSync(dumpPath, JSON.stringify({ url: String(targetUrl), headers: safeHeaders, body: openaiRequest }, null, 2), "utf-8");
        this.log(`[req ${seq}] OUT dump=${dumpPath}`);
      } catch (e) {
        this.log(`[req ${seq}] OUT dump failed: ${e.message}`);
      }
    } catch (e) {
      this.log(`[req ${seq}] summarize failed: ${e.message}`);
    }
  }

  async handleMessages(body, req, res) {
    // 레이트 리밋: 공급자 429 방지용 지연 (0=무제한)
    const seq = (this.requestSeq = (this.requestSeq || 0) + 1);
    const t0 = Date.now();
    await this.throttle();
    const rlDelay = Date.now() - t0;
    this.log(`[req ${seq}] rate-limit: delay=${rlDelay}ms, limit=${Number.isFinite(this.lastEffectiveLimit) ? this.lastEffectiveLimit + "/min" : "unlimited"}, window=${this.requestTimestamps.length}, model=${body.model || "?"}`);

    // 분류기 요청 처리: 전용 공급자가 설정되면 그쪽으로 라우팅, 아니면 메인 모델로 치환
    const isClassifier = this.isClassifierRequest(body.model, body);
    let effectiveTargetUrl = this.targetUrl;
    let effectiveApiKey = this.apiKey;
    let effectiveModel = this.model;
    if (isClassifier) {
      const hasClassifierOverride = this.classifierTargetUrl || this.classifierModel || this.classifierApiKey;
      if (hasClassifierOverride) {
        effectiveTargetUrl = this.classifierTargetUrl || this.targetUrl;
        effectiveApiKey = this.classifierApiKey || this.apiKey;
        effectiveModel = this.classifierModel || this.model;
        this.log(`[req ${seq}] classifier -> ${effectiveTargetUrl} model=${effectiveModel}`);
        body.model = effectiveModel;
      } else {
        body.model = this.model;
      }
    }

    // Anthropic → OpenAI 변환 (proxy의 유일한 목적)
    const openaiRequest = anthropicToOpenAI(body);
    if (effectiveModel) {
      openaiRequest.model = effectiveModel;
    }

    const base = effectiveTargetUrl.replace(/\/+$/, "");
    const apiBase = base.endsWith("/v1") ? base : base + "/v1";
    const targetUrl = new URL(apiBase + "/chat/completions");
    const isStream = openaiRequest.stream;

    // 타겟 API로 요청
    const targetModule = targetUrl.protocol === "https:" ? https : http;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${effectiveApiKey}`,
    };
    // 세션 헤더 on/off — 기본 켜짐. 끄기: CAM_SESSION_HEADER=off / CLI --session-header off / 프로필 CAM_SESSION_HEADER=off.
    if (this.sessionHeaderEnabled) {
      headers["x-opencode-session"] = this.sessionId;
    }

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      path: targetUrl.pathname,
      method: "POST",
      headers,
    };

    // 전문 비교용 상세 로그 (inbound vs outbound + 파일 덤프)
    this.summarizeBody(seq, body, openaiRequest, targetUrl, headers);

    if (isStream) {
      await this.handleStream(options, openaiRequest, body.model, res, seq);
    } else {
      await this.handleSync(options, openaiRequest, body.model, res, seq);
    }
  }

  handleSync(options, openaiRequest, model, res, seq) {
    return new Promise((resolve, reject) => {
      const targetModule = options.port === 443 ? https : http;
      const reqTag = seq ? `[req ${seq}] ` : "";
      const proxyReq = targetModule.request(options, (proxyRes) => {
        this.log(`RES ${proxyRes.statusCode} (sync)`);
        this.noteUpstreamStatus(proxyRes.statusCode);
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString();
            if (proxyRes.statusCode >= 400) {
              this.log(`UPSTREAM ERROR ${proxyRes.statusCode}: ${raw.slice(0, 500)}`);
              // upstream 에러 본문을 그대로 전달 (Claude Code가 실제 에러 메시지 표시)
              let errMsg = `Upstream error (${proxyRes.statusCode})`;
              try {
                const parsed = JSON.parse(raw);
                errMsg = (parsed.error && parsed.error.message) || errMsg;
              } catch {}
              res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  type: "error",
                  error: { type: "api_error", message: errMsg },
                })
              );
              resolve();
              return;
            }
            const openaiResponse = JSON.parse(raw);
            const anthropicResponse = openAIToAnthropic(openaiResponse);
            anthropicResponse.model = model || anthropicResponse.model;
            // 사용량 누적 (OpenAI: prompt_tokens/completion_tokens)
            if (openaiResponse.usage) {
              this.addUsage(
                openaiResponse.usage.prompt_tokens,
                openaiResponse.usage.completion_tokens
              );
            }
            res.writeHead(proxyRes.statusCode);
            res.end(JSON.stringify(anthropicResponse));
            resolve();
          } catch (err) {
            res.writeHead(502);
            res.end(
              JSON.stringify({
                type: "error",
                error: { type: "api_error", message: `Failed to parse upstream response: ${err.message}` },
              })
            );
            resolve();
          }
        });
      });

      proxyReq.on("error", (err) => {
        res.writeHead(502);
        res.end(
          JSON.stringify({
            type: "error",
            error: { type: "api_error", message: `Upstream connection error: ${err.message}` },
          })
        );
        resolve();
      });

      proxyReq.write(JSON.stringify(openaiRequest));
      proxyReq.end();
    });
  }

  handleStream(options, openaiRequest, model, res, seq) {
    return new Promise((resolve, reject) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const requestId = `msg_${Date.now()}`;
      const converter = new StreamConverter(res, requestId, model || "");
      converter.inputTokens = 0;
      let usageAdded = false;
      const addStreamUsage = () => {
        if (usageAdded) return;
        usageAdded = true;
        this.addUsage(converter.inputTokens, converter.outputTokens);
      };
      // mid-stream invalid 추적: upstream 원문 캡처 (앞 20줄 + error/invalid 포함 줄 전체)
      const reqTag = seq ? `[req ${seq}] ` : "";
      let streamChunkCount = 0;
      let streamRawBytes = 0;
      const streamHeadLines = [];
      const streamErrorLines = [];
      const streamDumpLines = [];
      const MAX_DUMP_LINES = 200;

      const targetModule = options.port === 443 ? https : http;
      const proxyReq = targetModule.request(options, (proxyRes) => {
        this.log(`RES ${proxyRes.statusCode} (stream)`);
        this.noteUpstreamStatus(proxyRes.statusCode);
        if (proxyRes.statusCode >= 400) {
          // upstream 에러 본문을 읽어 실제 에러 메시지를 SSE error 이벤트로 전달
          let errBody = "";
          proxyRes.on("data", (c) => (errBody += c.toString()));
          proxyRes.on("end", () => {
            this.log(`UPSTREAM ERROR ${proxyRes.statusCode}: ${errBody.slice(0, 500)}`);
            let errMsg = `Upstream error (${proxyRes.statusCode})`;
            try {
              const parsed = JSON.parse(errBody);
              errMsg = (parsed.error && parsed.error.message) || errMsg;
            } catch {}
            converter.sendError(proxyRes.statusCode, errMsg);
            res.end();
            resolve();
          });
          return;
        }
        let buffer = "";

        proxyRes.on("data", (chunk) => {
          try {
            const rawStr = chunk.toString();
            streamRawBytes += Buffer.byteLength(rawStr);
            streamChunkCount++;
            for (const rl of rawStr.split("\n")) {
              const t = rl.trim();
              if (!t) continue;
              if (streamHeadLines.length < 20) streamHeadLines.push(t.slice(0, 500));
              if (/error|invalid|rejected/i.test(t) && streamErrorLines.length < 20) streamErrorLines.push(t.slice(0, 1000));
              if (streamDumpLines.length < MAX_DUMP_LINES) streamDumpLines.push(t.slice(0, 1000));
            }
          } catch {}
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop(); // 불완전한 라인 버퍼 유지

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed === "data: [DONE]") {
              if (!converter.started) {
                converter.ensureStarted();
              }
              addStreamUsage();
              converter.finish("stop");
              continue;
            }

            if (trimmed.startsWith("data: ")) {
              try {
                const chunk = JSON.parse(trimmed.slice(6));
                converter.handleChunk(chunk);
              } catch {
                // 파싱 실패 무시
              }
            }
          }
        });

        proxyRes.on("end", () => {
          // 남은 버퍼 처리
          if (buffer.trim()) {
            if (buffer.trim() === "data: [DONE]") {
              addStreamUsage();
              converter.finish("stop");
            } else if (buffer.trim().startsWith("data: ")) {
              try {
                const chunk = JSON.parse(buffer.trim().slice(6));
                converter.handleChunk(chunk);
              } catch {}
            }
          }
          addStreamUsage();
          if (!converter.started) {
            converter.ensureStarted();
          }
          if (converter.textBlockOpen || Object.keys(converter.toolBlocks).length > 0) {
            converter.finish("stop");
          }
          try {
            this.log(`${reqTag}STREAM summary chunks=${streamChunkCount} bytes=${streamRawBytes} doneSeen=${streamDumpLines.some((l) => l.includes("[DONE]"))}`);
            for (const hl of streamHeadLines.slice(0, 20)) this.log(`${reqTag}STREAM head: ${hl}`);
            for (const el of streamErrorLines) this.log(`${reqTag}STREAM errline: ${el}`);
            try {
              const dumpPath = path.join(path.dirname(this.debugLogFile), `cam-stream-${seq || "x"}-${Date.now()}.log`);
              fs.writeFileSync(dumpPath, streamDumpLines.join("\n"), "utf-8");
              this.log(`${reqTag}STREAM dump=${dumpPath}`);
            } catch (e) { this.log(`${reqTag}STREAM dump failed: ${e.message}`); }
          } catch {}
          res.end();
          resolve();
        });

        proxyRes.on("error", (err) => {
          converter.sendError(502, err.message);
          res.end();
          resolve();
        });
      });

      proxyReq.on("error", (err) => {
        converter.ensureStarted();
        converter.sendError(502, err.message);
        res.end();
        resolve();
      });

      proxyReq.write(JSON.stringify(openaiRequest));
      proxyReq.end();
    });
  }

  getInfo() {
    return {
      port: this.port,
      targetUrl: this.targetUrl,
      profileName: this.profileName,
      running: this.running,
    };
  }
}

module.exports = { ProxyServer, parseRateLimit, parseSessionHeader, findPidOnPort, getProcessName, killPids };