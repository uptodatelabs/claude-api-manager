"use strict";

/**
 * 세션 헤더(x-opencode-session) 검증 — MultiCode 1b1be2f 이식분 대응 테스트.
 *
 * 배경: opencode Console Go(/zen/go/v1)가 세션 라우팅을 도입해 x-opencode-session
 * 헤더 없는 요청을 400(MissingSessionID)으로 거부. cam 프록시도 같은 공급자를
 * upstream으로 쓰면 동일하게 막히므로, handleMessages의 upstream 헤더에
 * 프로세스 수명 안정 세션 ID를 추가했다 (src/proxy/server.cjs).
 *
 * 검증 항목 (MultiCode scratch-session-header.ts의 H1~H4 대응):
 *  S1 채팅 요청에 x-opencode-session 헤더가 포함됨 (sync + stream)
 *  S2 같은 프로세스 내 요청들은 동일 세션 ID (요청별 무작위 아님)
 *  S2b 다른 cam 인스턴스는 다른 세션 ID (인스턴스 단위 고유성)
 *  S3 manager 미지정 시 settings 백업/수정 없음
 *  S4 sessionHeader:'off' 시 x-opencode-session 미전송
 *  S5 env CAM_SESSION_HEADER=off 시 x-opencode-session 미전송
 *  S6 parseSessionHeader on/off 매핑
 *
 * 실행: node test/session-header.cjs  (npm test로 실행됨)
 *
 * 주의: manager 옵션 없이 ProxyServer를 띄우면 settings.json을 건드리지 않는다
 * (applyProxySettings/restoreSettings 모두 manager truthy 조건).
 */

const http = require("http");
const net = require("net");
const path = require("path");
const os = require("os");
const { ProxyServer } = require("../src/proxy/server.cjs");

// ProxyServer는 생성 시 debugLogFile 기본(홈)에 writeFileSync로 헤더를 쓴다.
// 실사용자 프록시 로그 덮어쓰기 방지를 위해 tmp로 격리 (env > 기본 순).
process.env.CAM_DEBUG_LOG_FILE = path.join(os.tmpdir(), "cam-test-session-header.log");

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, "—", detail);
  }
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

/** ProxyServer는 options.port || 3456 폴백이라 port:0을 넘기면 3456으로 고정된다
 *  (실사용 서버와 충돌 — EADDRINUSE). 임시 리스너로 빈 포트 하나 확보 후 명시 전달. */
function freePort() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const p = probe.address().port;
      probe.close(() => resolve(p));
    });
  });
}

/** mock: x-opencode-session 헤더를 기록하는 OpenAI 호환 업스트림.
 *  프록시는 sync/stream 모두 /chat/completions로 호출하므로(server.cjs handleMessages),
 *  요청 본문의 stream 플래그에 따라 JSON / SSE로 분기해야 SSE 변환 경로가 실제 검증된다. */
function makeUpstream(sink) {
  const up = http.createServer((req, res) => {
    sink.push(String(req.headers["x-opencode-session"] ?? ""));
    let raw = "";
    req.on("data", (c) => (raw += c.toString()));
    req.on("end", () => {
      let wantStream = false;
      try {
        wantStream = !!JSON.parse(raw).stream;
      } catch {}
      if ((req.url || "").endsWith("/chat/completions")) {
        if (wantStream) {
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.write(
            `data: ${JSON.stringify({ id: "cmpl-1", object: "chat.completion.chunk", choices: [{ index: 0, delta: { role: "assistant", content: "OK" } }] })}\n\n`
          );
          res.write(
            `data: ${JSON.stringify({ id: "cmpl-1", object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`
          );
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              id: "cmpl-1",
              object: "chat.completion",
              model: "mock",
              choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }],
              usage: { prompt_tokens: 1, completion_tokens: 1 },
            })
          );
        }
      } else {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "not found" } }));
      }
    });
  });
  return up;
}

/** 프록시에 Anthropic Messages 요청을 보내고 응답 본문을 회수 */
function callProxy(port, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/v1/messages",
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(data) },
      },
      (res) => {
        let out = "";
        res.on("data", (c) => (out += c.toString()));
        res.on("end", () => resolve({ status: res.statusCode, body: out }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

const anthropicBody = (stream) => ({
  model: "claude-sonnet-4-5",
  max_tokens: 64,
  messages: [{ role: "user", content: "안녕" }],
  ...(stream ? { stream: true } : {}),
});

async function main() {
  // 인스턴스 A — sync/stream 모두 헤더가 실려야 한다
  const sinkA = [];
  const upA = makeUpstream(sinkA);
  const upAPort = await listen(upA);
  const proxyA = new ProxyServer({
    port: await freePort(),
    targetUrl: `http://127.0.0.1:${upAPort}/v1`,
    apiKey: "k",
    model: "mock-model",
  });
  await proxyA.start();
  const portA = proxyA.port;

  // 인스턴스 B — 다른 세션 ID여야 한다
  const sinkB = [];
  const upB = makeUpstream(sinkB);
  const upBPort = await listen(upB);
  const proxyB = new ProxyServer({
    port: await freePort(),
    targetUrl: `http://127.0.0.1:${upBPort}/v1`,
    apiKey: "k",
    model: "mock-model",
  });
  await proxyB.start();
  const portB = proxyB.port;

  // S1a sync 요청에 헤더 포함
  const r1 = await callProxy(portA, anthropicBody(false));
  check(
    "S1a sync 요청에 x-opencode-session 포함",
    r1.status === 200 && sinkA.length === 1 && sinkA[0].startsWith("cam-"),
    `status=${r1.status} sink=${JSON.stringify(sinkA)} body=${r1.body.slice(0, 120)}`
  );

  // S1b stream 요청에도 헤더 포함 + 업스트림 SSE 응답이 Anthropic SSE로 변환되어 와야 한다
  const r2 = await callProxy(portA, anthropicBody(true));
  check(
    "S1b stream 요청에 x-opencode-session 포함",
    sinkA.length === 2 && sinkA[1].startsWith("cam-"),
    JSON.stringify(sinkA)
  );
  check(
    "S1c 업스트림 SSE → Anthropic SSE 변환 경로 검증",
    r2.body.includes("event: content_block_delta") && r2.body.includes("OK") && r2.body.includes("message_stop"),
    `status=${r2.status} body=${r2.body.slice(0, 200)}`
  );

  // S2 같은 프로세스 내 요청들은 동일 세션 ID
  await callProxy(portA, anthropicBody(false));
  check(
    "S2 같은 프로세스 수명 동안 동일 세션 ID (안정성)",
    sinkA.length === 3 && sinkA.every((s) => s === sinkA[0] && s.length > "cam-".length),
    JSON.stringify(sinkA)
  );

  // S2b 다른 인스턴스는 다른 ID
  await callProxy(portB, anthropicBody(false));
  check(
    "S2b 인스턴스별로 고유한 세션 ID",
    sinkB.length === 1 && sinkB[0].startsWith("cam-") && sinkB[0] !== sinkA[0],
    `A=${JSON.stringify(sinkA)} B=${JSON.stringify(sinkB)}`
  );

  // settings.json 무건드림 확인 (manager 미지정)
  check("S3 manager 미지정 시 settings 백업/수정 없음", !proxyA.settingsBackup, JSON.stringify(proxyA.settingsBackup));

  // S4 sessionHeader:'off' → 업스트림에 헤더 미전송 (엄격 게이트웨이 대응)
  const sinkC = [];
  const upC = makeUpstream(sinkC);
  const upCPort = await listen(upC);
  const proxyC = new ProxyServer({
    port: await freePort(),
    targetUrl: `http://127.0.0.1:${upCPort}/v1`,
    apiKey: "k",
    model: "mock-model",
    sessionHeader: "off",
  });
  await proxyC.start();
  const rC = await callProxy(proxyC.port, anthropicBody(false));
  check(
    "S4 sessionHeader off 시 x-opencode-session 미전송",
    rC.status === 200 && sinkC.length === 1 && sinkC[0] === "",
    `status=${rC.status} sink=${JSON.stringify(sinkC)} body=${rC.body.slice(0, 120)}`
  );
  await proxyC.stop();
  upC.close();

  // S5 env CAM_SESSION_HEADER=off → 업스트림에 헤더 미전송 (프로필/환경 경로)
  const prevEnv = process.env.CAM_SESSION_HEADER;
  process.env.CAM_SESSION_HEADER = "off";
  const sinkD = [];
  const upD = makeUpstream(sinkD);
  const upDPort = await listen(upD);
  const proxyD = new ProxyServer({
    port: await freePort(),
    targetUrl: `http://127.0.0.1:${upDPort}/v1`,
    apiKey: "k",
    model: "mock-model",
  });
  await proxyD.start();
  const rD = await callProxy(proxyD.port, anthropicBody(false));
  check(
    "S5 env CAM_SESSION_HEADER=off 시 x-opencode-session 미전송",
    rD.status === 200 && sinkD.length === 1 && sinkD[0] === "",
    `status=${rD.status} sink=${JSON.stringify(sinkD)} body=${rD.body.slice(0, 120)}`
  );
  await proxyD.stop();
  upD.close();
  if (prevEnv === undefined) delete process.env.CAM_SESSION_HEADER;
  else process.env.CAM_SESSION_HEADER = prevEnv;

  // S6 parseSessionHeader on/off 매핑
  const { parseSessionHeader } = require("../src/proxy/server.cjs");
  const mappingOk =
    parseSessionHeader(undefined, true) === true &&
    parseSessionHeader("", true) === true &&
    parseSessionHeader("on", true) === true &&
    parseSessionHeader("1", true) === true &&
    parseSessionHeader("off", true) === false &&
    parseSessionHeader("0", true) === false &&
    parseSessionHeader("false", true) === false;
  check("S6 parseSessionHeader on/off 매핑", mappingOk, "undefined/''/on/1→true, off/0/false→false 기대");

  await proxyA.stop();
  await proxyB.stop();
  upA.close();
  upB.close();

  console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
