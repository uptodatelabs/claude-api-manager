"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { URL } = require("url");
const { anthropicToOpenAI, openAIToAnthropic } = require("./convert.cjs");
const { StreamConverter } = require("./stream.cjs");

const BACKUP_FILE = path.join(os.homedir(), ".claude-api-manager", "proxy-settings-backup.json");
const DEBUG_LOG_FILE = path.join(os.homedir(), ".claude-api-manager", "proxy-debug.log");
const MAX_DEBUG_LOGS = 100;

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
    this.profileName = options.profileName || "";
    this.manager = options.manager || null;
    this.server = null;
    this.running = false;
    this.settingsBackup = null;
    this.usage = { inputTokens: 0, outputTokens: 0, requests: 0 };
    this.debug = !!options.debug;
    this.debugLogs = [];
    // 로그 파일 초기화 (시작 시 새로 시작)
    try {
      fs.mkdirSync(path.dirname(DEBUG_LOG_FILE), { recursive: true });
      fs.writeFileSync(DEBUG_LOG_FILE, `=== proxy debug log started ${new Date().toISOString()} ===\n`, "utf-8");
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
      fs.appendFileSync(DEBUG_LOG_FILE, line + "\n", "utf-8");
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

  start() {
    return new Promise((resolve, reject) => {
      const tryListen = (port) => {
        const srv = http.createServer((req, res) => this.handleRequest(req, res));
        srv.on("error", (err) => {
          if (err.code === "EADDRINUSE" && port < this.port + 20) {
            // 포트 사용 중 → 다음 포트로 자동 이동
            tryListen(port + 1);
          } else {
            reject(err);
          }
        });
        srv.listen(port, () => {
          this.server = srv;
          this.port = port;
          this.running = true;
          // listen 성공 후에만 settings.json 반영 (실패 시 잔여 설정 방지)
          if (this.manager) {
            this.applyProxySettings();
          }
          resolve();
        });
      };
      tryListen(this.port);
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

  // 프로세스 급작 종료 등으로 남은 백업을 감지해 settings.json 복원
  static restoreFromDisk(manager) {
    if (!fs.existsSync(BACKUP_FILE)) return false;
    try {
      const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
      const current = manager.readSettings() || {};
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
  // auto 모드에서 안전성 판단용으로 claude-sonnet-*[1m] 같은 모델을 호출하는데,
  // upstream이 이 모델을 모르면 실패하므로 프로필 모델로 치환
  isClassifierRequest(model) {
    if (!model || !this.model) return false;
    const m = String(model).toLowerCase();
    // 프로필 모델과 다르고 sonnet/haiku 계열이면 분류기 요청으로 간주
    if (m === String(this.model).toLowerCase()) return false;
    return m.includes("sonnet") || m.includes("haiku");
  }

  async handleMessages(body, req, res) {
    // 분류기 요청이면 프로필 모델로 치환
    if (this.isClassifierRequest(body.model)) {
      body.model = this.model;
    }

    // Anthropic → OpenAI 변환 (proxy의 유일한 목적)
    const openaiRequest = anthropicToOpenAI(body);
    if (this.model) {
      openaiRequest.model = this.model;
    }

    const base = this.targetUrl.replace(/\/+$/, "");
    const apiBase = base.endsWith("/v1") ? base : base + "/v1";
    const targetUrl = new URL(apiBase + "/chat/completions");
    const isStream = openaiRequest.stream;

    // 타겟 API로 요청
    const targetModule = targetUrl.protocol === "https:" ? https : http;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
      path: targetUrl.pathname,
      method: "POST",
      headers,
    };

    if (isStream) {
      await this.handleStream(options, openaiRequest, body.model, res);
    } else {
      await this.handleSync(options, openaiRequest, body.model, res);
    }
  }

  handleSync(options, openaiRequest, model, res) {
    return new Promise((resolve, reject) => {
      const targetModule = options.port === 443 ? https : http;
      const proxyReq = targetModule.request(options, (proxyRes) => {
        this.log(`RES ${proxyRes.statusCode} (sync)`);
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString();
            const openaiResponse = JSON.parse(raw);
            if (proxyRes.statusCode >= 400) {
              this.log(`UPSTREAM ERROR ${proxyRes.statusCode}: ${raw.slice(0, 500)}`);
            }
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

  handleStream(options, openaiRequest, model, res) {
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

      const targetModule = options.port === 443 ? https : http;
      const proxyReq = targetModule.request(options, (proxyRes) => {
        this.log(`RES ${proxyRes.statusCode} (stream)`);
        if (proxyRes.statusCode >= 400) {
          let errBody = "";
          proxyRes.on("data", (c) => (errBody += c.toString()));
          proxyRes.on("end", () => {
            this.log(`UPSTREAM ERROR ${proxyRes.statusCode}: ${errBody.slice(0, 500)}`);
          });
        }
        let buffer = "";

        proxyRes.on("data", (chunk) => {
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

module.exports = { ProxyServer };