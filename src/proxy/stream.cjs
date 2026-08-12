"use strict";

/**
 * OpenAI SSE 스트리밍 → Anthropic SSE 스트리밍 변환
 *
 * OpenAI 스트림:
 *   data: {"choices":[{"delta":{"content":"Hello"}}]}
 *   data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
 *   data: [DONE]
 *
 * Anthropic 스트림:
 *   event: message_start
 *   event: content_block_start
 *   event: content_block_delta
 *   event: content_block_stop
 *   event: message_delta
 *   event: message_stop
 */

const { mapFinishReason } = require("./convert.cjs");

class StreamConverter {
  constructor(res, requestId, model) {
    this.res = res;
    this.requestId = requestId || `msg_${Date.now()}`;
    this.model = model || "";
    this.started = false;
    this.blockIndex = 0;
    this.blockStarted = false;
    this.textBlockOpen = false;
    this.toolBlocks = {}; // index → { id, name, started }
    this.inputTokens = 0;
    this.outputTokens = 0;
  }

  writeSSE(event, data) {
    if (event) this.res.write(`event: ${event}\n`);
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  ensureStarted() {
    if (this.started) return;
    this.started = true;
    this.writeSSE("message_start", {
      type: "message_start",
      message: {
        id: this.requestId,
        type: "message",
        role: "assistant",
        content: [],
        model: this.model,
        stop_reason: null,
        usage: { input_tokens: this.inputTokens, output_tokens: 0 },
      },
    });
  }

  ensureTextBlockOpen() {
    this.ensureStarted();
    if (!this.textBlockOpen) {
      this.textBlockOpen = true;
      this.writeSSE("content_block_start", {
        type: "content_block_start",
        index: this.blockIndex,
        content_block: { type: "text", text: "" },
      });
    }
  }

  closeTextBlock() {
    if (this.textBlockOpen) {
      this.writeSSE("content_block_stop", {
        type: "content_block_stop",
        index: this.blockIndex,
      });
      this.blockIndex++;
      this.textBlockOpen = false;
    }
  }

  handleTextDelta(text) {
    if (!text) return;
    this.ensureTextBlockOpen();
    this.writeSSE("content_block_delta", {
      type: "content_block_delta",
      index: this.textBlockOpen ? this.blockIndex : 0,
      delta: { type: "text_delta", text },
    });
  }

  handleToolCallStart(toolCall) {
    this.ensureStarted();
    this.closeTextBlock();
    const idx = this.blockIndex;
    this.toolBlocks[idx] = {
      id: toolCall.id,
      name: toolCall.function && toolCall.function.name,
      started: true,
      args: "",
    };
    this.writeSSE("content_block_start", {
      type: "content_block_start",
      index: idx,
      content_block: {
        type: "tool_use",
        id: toolCall.id,
        name: toolCall.function && toolCall.function.name,
        input: {},
      },
    });
  }

  handleToolCallDelta(toolCall) {
    const idx = this.blockIndex;
    const block = this.toolBlocks[idx];
    if (!block) return;
    const args = (toolCall.function && toolCall.function.arguments) || "";
    block.args += args;
    this.writeSSE("content_block_delta", {
      type: "content_block_delta",
      index: idx,
      delta: { type: "input_json_delta", partial_json: args },
    });
  }

  handleToolCallEnd() {
    const idx = this.blockIndex;
    if (this.toolBlocks[idx]) {
      this.writeSSE("content_block_stop", {
        type: "content_block_stop",
        index: idx,
      });
      this.blockIndex++;
      delete this.toolBlocks[idx];
    }
  }

  /**
   * OpenAI 스트리밍 청크 하나 처리
   */
  handleChunk(chunk) {
    // 스트림 종료 청크의 usage (OpenAI는 마지막 청크에 usage 포함)
    if (chunk.usage) {
      if (Number.isFinite(chunk.usage.prompt_tokens)) {
        this.inputTokens = chunk.usage.prompt_tokens;
      }
      if (Number.isFinite(chunk.usage.completion_tokens)) {
        this.outputTokens = chunk.usage.completion_tokens;
      }
    }
    // tool_calls 인덱스 추적 (OpenAI의 index 기반)
    if (chunk.choices && chunk.choices[0]) {
      const delta = chunk.choices[0].delta || {};
      const finishReason = chunk.choices[0].finish_reason;

      // content 텍스트
      if (delta.content) {
        this.handleTextDelta(delta.content);
      }

      // tool_calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id) {
            // 새 tool call 시작
            this.handleToolCallStart(tc);
          } else if (tc.function && tc.function.arguments) {
            // tool call 인자 스트리밍
            this.handleToolCallDelta(tc);
          }
        }
      }

      // 스트림 종료
      if (finishReason) {
        this.finish(finishReason);
      }
    }
  }

  finish(finishReason) {
    this.closeTextBlock();
    // 열린 tool_use 블록 닫기
    for (const idx of Object.keys(this.toolBlocks)) {
      this.handleToolCallEnd();
    }

    this.writeSSE("message_delta", {
      type: "message_delta",
      delta: {
        stop_reason: mapFinishReason(finishReason),
        stop_sequence: null,
      },
      usage: { output_tokens: this.outputTokens },
    });

    this.writeSSE("message_stop", {
      type: "message_stop",
    });
  }

  /**
   * 프록시 에러를 Anthropic 형식으로 반환
   */
  sendError(status, message) {
    this.ensureStarted();
    this.closeTextBlock();
    this.writeSSE("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 0 },
    });
    this.writeSSE("message_stop", { type: "message_stop" });
  }
}

module.exports = { StreamConverter };