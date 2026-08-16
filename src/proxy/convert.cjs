"use strict";

/**
 * Anthropic Messages API ↔ OpenAI Chat Completions API 변환
 */

// ── Anthropic → OpenAI 요청 변환 ──────────────────────────────────────

function convertSystemToMessages(system) {
  if (!system) return [];
  if (typeof system === "string") {
    return [{ role: "system", content: system }];
  }
  // 배열(TextBlockParam[])
  const text = system.map((b) => b.text || "").join("\n");
  return text ? [{ role: "system", content: text }] : [];
}

function convertAnthropicContent(content) {
  // content가 문자열이면 그대로 반환
  if (typeof content === "string") return { text: content, thinking: "", toolCalls: [], toolResults: [] };

  const toolCalls = [];
  const toolResults = [];
  const textParts = [];
  const thinkingParts = [];

  for (const block of content) {
    if (block.type === "text") {
      textParts.push(block.text || "");
    } else if (block.type === "thinking") {
      // thinking → OpenAI reasoning_content (thinking 모드 upstream은 이를 돌려받아야 함)
      thinkingParts.push(block.thinking || "");
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input || {}),
        },
      });
    } else if (block.type === "tool_result") {
      let resultText = "";
      if (typeof block.content === "string") {
        resultText = block.content;
      } else if (Array.isArray(block.content)) {
        resultText = block.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }
      toolResults.push({
        role: "tool",
        tool_call_id: block.tool_use_id,
        content: resultText,
      });
    }
  }

  return {
    text: textParts.join("\n"),
    thinking: thinkingParts.join(""),
    toolCalls,
    toolResults,
  };
}

function convertAnthropicTools(tools) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.input_schema || {},
    },
  }));
}

/**
 * Anthropic Messages 요청 → OpenAI Chat Completions 요청
 */
function anthropicToOpenAI(body) {
  const messages = [];

  // system → system message
  const systemMessages = convertSystemToMessages(body.system);
  messages.push(...systemMessages);

  // messages 변환
  let lastAssistantHadToolCalls = false;
  for (const msg of body.messages || []) {
    const { text, thinking, toolCalls, toolResults } = convertAnthropicContent(msg.content);

    if (msg.role === "user") {
      // tool_result는 이전 assistant의 tool_calls에 대한 응답이므로
      // OpenAI 규격상 assistant(tool_calls) 직후(tool role)에 와야 함 — text보다 먼저 push
      if (lastAssistantHadToolCalls && toolResults.length > 0) {
        messages.push(...toolResults);
      }
      if (text) {
        messages.push({ role: "user", content: text });
      }
      lastAssistantHadToolCalls = false;
    } else if (msg.role === "assistant") {
      if (text || toolCalls.length > 0 || thinking) {
        const assistantMsg = { role: "assistant", content: text || null };
        if (thinking) {
          // thinking 모드 upstream은 이전 reasoning_content를 돌려받아야 함
          assistantMsg.reasoning_content = thinking;
        }
        if (toolCalls.length > 0) {
          assistantMsg.tool_calls = toolCalls;
        }
        messages.push(assistantMsg);
      }
      lastAssistantHadToolCalls = toolCalls.length > 0;
    } else if (msg.role === "tool") {
      // 직접 tool role 메시지 (드문 경우)
      messages.push(msg);
      lastAssistantHadToolCalls = false;
    }
  }

  // tools 변환
  const openaiTools = convertAnthropicTools(body.tools);

  // model 변환: Anthropic 모델명 → OpenAI 모델명 (필요시)
  const model = body.model || "gpt-4";

  const result = {
    model,
    messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    stream: body.stream || false,
  };

  if (openaiTools && openaiTools.length > 0) {
    result.tools = openaiTools;
  }
  if (body.tool_choice) {
    result.tool_choice = convertToolChoice(body.tool_choice);
  }
  if (body.stop_sequences) {
    result.stop = body.stop_sequences;
  }

  return result;
}

function convertToolChoice(choice) {
  if (!choice) return undefined;
  if (choice.type === "auto") return "auto";
  if (choice.type === "any") return "required";
  if (choice.type === "none") return "none";
  if (choice.type === "tool") {
    return { type: "function", function: { name: choice.name } };
  }
  return "auto";
}

// ── OpenAI → Anthropic 응답 변환 ──────────────────────────────────────

function convertOpenAIToolCalls(toolCalls) {
  if (!toolCalls || toolCalls.length === 0) return [];
  return toolCalls.map((tc) => {
    let input = {};
    try {
      input = JSON.parse(tc.function.arguments);
    } catch {
      input = { raw: tc.function.arguments };
    }
    return {
      type: "tool_use",
      id: tc.id,
      name: tc.function.name,
      input,
    };
  });
}

function mapFinishReason(reason) {
  switch (reason) {
    case "stop": return "end_turn";
    case "length": return "max_tokens";
    case "tool_calls": return "tool_use";
    case "content_filter": return "end_turn";
    default: return "end_turn";
  }
}

/**
 * OpenAI Chat Completions 응답 → Anthropic Messages 응답
 */
function openAIToAnthropic(openaiResponse) {
  const choice = openaiResponse.choices && openaiResponse.choices[0];
  if (!choice) {
    return {
      id: openaiResponse.id || `msg_${Date.now()}`,
      type: "message",
      role: "assistant",
      content: [],
      model: openaiResponse.model || "",
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  const content = [];
  // thinking 모드 upstream의 reasoning_content → thinking 블록 (text보다 먼저)
  if (choice.message.reasoning_content) {
    content.push({
      type: "thinking",
      thinking: choice.message.reasoning_content,
      signature: "",
    });
  }
  if (choice.message.content) {
    content.push({
      type: "text",
      text: choice.message.content,
    });
  }

  // tool_calls → tool_use 블록
  const toolUseBlocks = convertOpenAIToolCalls(choice.message.tool_calls);
  content.push(...toolUseBlocks);

  return {
    id: openaiResponse.id || `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    content,
    model: openaiResponse.model || "",
    stop_reason: mapFinishReason(choice.finish_reason),
    usage: {
      input_tokens: (openaiResponse.usage && openaiResponse.usage.prompt_tokens) || 0,
      output_tokens: (openaiResponse.usage && openaiResponse.usage.completion_tokens) || 0,
    },
  };
}

module.exports = {
  anthropicToOpenAI,
  openAIToAnthropic,
  convertAnthropicTools,
  convertOpenAIToolCalls,
  mapFinishReason,
};