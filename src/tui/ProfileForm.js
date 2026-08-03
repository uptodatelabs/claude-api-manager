"use strict";
const React = require("react");
const { Box, Text, useInput } = require("ink");
const TextInput = require("ink-text-input").default;
const SelectInput = require("ink-select-input").default;
const { theme, providerName } = require("./theme");

const PROVIDERS = [
  { label: "Anthropic API (기본)", value: "anthropic" },
  { label: "Amazon Bedrock", value: "bedrock" },
  { label: "Google Cloud Agent Platform", value: "vertex" },
  { label: "Microsoft Foundry", value: "foundry" },
  { label: "Claude Platform on AWS", value: "aws" },
];

function isKnownEnvKey(key) {
  return [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "CLAUDE_CODE_USE_BEDROCK",
    "AWS_REGION",
    "ANTHROPIC_BEDROCK_BASE_URL",
    "ANTHROPIC_BEDROCK_SERVICE_TIER",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "CLAUDE_CODE_USE_VERTEX",
    "CLOUD_ML_REGION",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "ANTHROPIC_VERTEX_BASE_URL",
    "CLAUDE_CODE_USE_FOUNDRY",
    "ANTHROPIC_FOUNDRY_RESOURCE",
    "ANTHROPIC_FOUNDRY_BASE_URL",
    "ANTHROPIC_FOUNDRY_API_KEY",
    "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
    "ANTHROPIC_AWS_WORKSPACE_ID",
    "ANTHROPIC_AWS_API_KEY",
    "ANTHROPIC_AWS_BASE_URL",
  ].includes(key);
}

function Field({ label, value, onChange, placeholder, focus, isEdit, hasExisting, deleteHint, validate }) {
  return React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
    React.createElement(Box, null,
      theme.primary(label),
      hasExisting && isEdit
        ? React.createElement(Text, { color: "red" }, " (- 입력 시 삭제)")
        : null,
      hasExisting && !isEdit
        ? React.createElement(Text, { color: "gray" }, " (선택)")
        : null
    ),
    React.createElement(TextInput, {
      value: value,
      onChange: onChange,
      placeholder: placeholder,
      focus: focus,
    })
  );
}

function CustomEnvField({ value, onChange, focus }) {
  return React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
    React.createElement(Box, null,
      theme.primary("환경변수 이름"),
      React.createElement(Text, { color: "gray" }, " (예: API_TIMEOUT_MS)")
    ),
    React.createElement(TextInput, {
      value: value,
      onChange: onChange,
      placeholder: "비우면 종료",
      focus: focus,
    })
  );
}

function FormStep({ step, formData, setFormData, onNext, onPrev, onSubmit, isEdit }) {
  useInput((input, key) => {
    if (key.return) onNext();
    if (key.escape) onPrev();
  });

  const fields = {
    provider: () => React.createElement(Box, { flexDirection: "column" },
      React.createElement(Box, { marginBottom: 1 },
        theme.primary.bold("Step 1/5: API 공급자 선택")),
      React.createElement(SelectInput, {
        items: PROVIDERS,
        onSelect: (item) => {
          setFormData({ ...formData, provider: item.value });
          setTimeout(onNext, 100);
        },
      })
    ),

    anthropic_keys: () => React.createElement(Box, { flexDirection: "column" },
      React.createElement(Box, { marginBottom: 1 },
        theme.primary.bold("Step 2/5: API 키 설정"),
        React.createElement(Text, { color: "gray" },
          " 둘 중 하나는 필수. - 입력 시 기존값 삭제.")
      ),
      React.createElement(Field, {
        label: "ANTHROPIC_API_KEY",
        value: formData.ANTHROPIC_API_KEY || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_API_KEY: v }),
        focus: true,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_API_KEY),
      }),
      React.createElement(Field, {
        label: "ANTHROPIC_AUTH_TOKEN",
        value: formData.ANTHROPIC_AUTH_TOKEN || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_AUTH_TOKEN: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_AUTH_TOKEN),
      }),
      React.createElement(Field, {
        label: "ANTHROPIC_BASE_URL",
        value: formData.ANTHROPIC_BASE_URL || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_BASE_URL: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_BASE_URL),
      })
    ),

    model: () => React.createElement(Box, { flexDirection: "column" },
      React.createElement(Box, { marginBottom: 1 },
        theme.primary.bold("Step 3/5: 모델 설정")
      ),
      React.createElement(Field, {
        label: "ANTHROPIC_MODEL",
        value: formData.ANTHROPIC_MODEL || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_MODEL: v }),
        focus: true,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_MODEL),
        placeholder: "opus, sonnet, claude-sonnet-4-5-20250514",
      }),
      React.createElement(Field, {
        label: "ANTHROPIC_DEFAULT_OPUS_MODEL",
        value: formData.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_DEFAULT_OPUS_MODEL: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_DEFAULT_OPUS_MODEL),
      }),
      React.createElement(Field, {
        label: "ANTHROPIC_DEFAULT_SONNET_MODEL",
        value: formData.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_DEFAULT_SONNET_MODEL: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_DEFAULT_SONNET_MODEL),
      }),
      React.createElement(Field, {
        label: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
        value: formData.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
        onChange: (v) => setFormData({ ...formData, ANTHROPIC_DEFAULT_HAIKU_MODEL: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.ANTHROPIC_DEFAULT_HAIKU_MODEL),
      }),
      React.createElement(Field, {
        label: "fallbackModel (쉼표 구분)",
        value: formData.fallbackModel || "",
        onChange: (v) => setFormData({ ...formData, fallbackModel: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.fallbackModel),
      })
    ),

    meta: () => React.createElement(Box, { flexDirection: "column" },
      React.createElement(Box, { marginBottom: 1 },
        theme.primary.bold("Step 4/5: 메타데이터 (선택)")
      ),
      React.createElement(Field, {
        label: "설명",
        value: formData.description || "",
        onChange: (v) => setFormData({ ...formData, description: v }),
        focus: true,
        isEdit: isEdit,
        hasExisting: !!(formData.description),
        placeholder: "이 프로필의 용도/메모",
      }),
      React.createElement(Field, {
        label: "태그 (쉼표 구분)",
        value: formData.tags || "",
        onChange: (v) => setFormData({ ...formData, tags: v }),
        focus: false,
        isEdit: isEdit,
        hasExisting: !!(formData.tags),
        placeholder: "work, proxy, ollama",
      })
    ),

    confirm: () => React.createElement(Box, { flexDirection: "column" },
      React.createElement(Box, { marginBottom: 1 },
        theme.primary.bold("Step 5/5: 확인")
      ),
      React.createElement(Box, { marginBottom: 1, paddingX: 1, borderStyle: "single", borderColor: "gray" },
        React.createElement(Box, null,
          React.createElement(Text, { color: "gray" }, "공급자: "),
          theme.primary(providerName(formData.provider || "anthropic"))
        ),
        Object.entries(formData).filter(([k]) => !["provider", "description", "tags", "fallbackModel"].includes(k)).map(([k, v]) =>
          v
            ? React.createElement(Box, { key: k },
                React.createElement(Text, { color: "gray" }, k + ": "),
                React.createElement(Text, null, v))
            : null
        ),
        formData.description
          ? React.createElement(Box, null,
              React.createElement(Text, { color: "gray" }, "설명: "),
              React.createElement(Text, null, formData.description))
          : null,
        formData.tags
          ? React.createElement(Box, null,
              React.createElement(Text, { color: "gray" }, "태그: "),
              React.createElement(Text, null, formData.tags))
          : null
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { color: "gray" },
          "Enter로 저장, Esc로 취소")
      )
    ),
  };

  return React.createElement(Box, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "cyan",
    paddingX: 1,
    flexGrow: 1,
  },
    React.createElement(Box, { marginBottom: 1, justifyContent: "space-between" },
      theme.brand(isEdit ? "✎ Edit Profile" : "✦ New Profile"),
      React.createElement(Text, { color: "gray" },
        "[Enter] 다음   [Esc] 취소")
    ),
    fields[step]()
  );
}

module.exports = { FormStep };