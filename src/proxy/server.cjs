"use strict";

const http = require("http");
const https = require("https");
const { URL } = require("url");
const { anthropicToOpenAI, openAIToAnthropic } = require("./convert.cjs");
const { StreamConverter } = require("./stream.cjs");

/**
 * OpenAI 호환 API 프록시 서버
 * Claude Code → (Anthropic 형식) → 프록시 → (OpenAI 형식) → OpenAI 호환 API
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
  }

  start() {
    return new Promise((resolve, reject) => {
      // settings.json 자동 설정
      if (this.manager) {
        this.applyProxySettings();
      }

      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        this.running = true;
        resolve();
      });
      this.server.on("error", reject);
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
    // 현재 env 백업
    this.settingsBackup = {
      env: current.env ? { ...current.env } : {},
      model: current.model || null,
    };

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

    // Anthropic Messages 엔드포인트
    if (req.method === "POST" && req.url === "/v1/messages") {
      try {
        const body = await this.readBody(req);
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

  async handleMessages(body, req, res) {
    // Anthropic → OpenAI 변환
    const openaiRequest = anthropicToOpenAI(body);
    if (this.model) {
      openaiRequest.model = this.model;
    }

    const targetUrl = new URL("/v1/chat/completions", this.targetUrl);
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
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString();
            const openaiResponse = JSON.parse(raw);
            const anthropicResponse = openAIToAnthropic(openaiResponse);
            anthropicResponse.model = model || anthropicResponse.model;
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

      const targetModule = options.port === 443 ? https : http;
      const proxyReq = targetModule.request(options, (proxyRes) => {
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
              converter.finish("stop");
            } else if (buffer.trim().startsWith("data: ")) {
              try {
                const chunk = JSON.parse(buffer.trim().slice(6));
                converter.handleChunk(chunk);
              } catch {}
            }
          }
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