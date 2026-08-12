"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { colors, providerName } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

export const PROVIDER_VALUES = [
  { value: "anthropic" },
  { value: "bedrock" },
  { value: "vertex" },
  { value: "foundry" },
  { value: "aws" },
  { value: "proxy" },
];

// 관리되는 표준 env 키 (custom으로 분류되지 않음)
export const KNOWN_ENV_KEYS = [
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
];

// 각 스텝의 입력 필드 정의 (순차 입력, 라벨은 i18n 키)
const STEP_FIELDS = {
  keys: [
    { name: "ANTHROPIC_API_KEY", labelKey: "ANTHROPIC_API_KEY", placeholderKey: "apiKeyPlaceholder" },
    { name: "ANTHROPIC_AUTH_TOKEN", labelKey: "ANTHROPIC_AUTH_TOKEN", placeholderKey: "authTokenPlaceholder" },
    { name: "ANTHROPIC_BASE_URL", labelKey: "ANTHROPIC_BASE_URL", placeholderKey: "baseUrlPlaceholder" },
    { name: "AWS_REGION", labelKey: "AWS_REGION", placeholderKey: "regionPlaceholder" },
  ],
  proxy_keys: [
    { name: "ANTHROPIC_BASE_URL", labelKey: "proxyApiUrl", placeholderKey: "proxyApiUrlPlaceholder" },
    { name: "ANTHROPIC_API_KEY", labelKey: "proxyApiKey", placeholderKey: "proxyApiKeyPlaceholder" },
    { name: "ANTHROPIC_MODEL", labelKey: "proxyModel", placeholderKey: "proxyModelPlaceholder" },
  ],
  meta: [
    { name: "ANTHROPIC_MODEL", labelKey: "ANTHROPIC_MODEL", placeholderKey: "ANTHROPIC_MODEL" },
    { name: "model", labelKey: "modelLabel", placeholderKey: "modelLabel" },
    { name: "fallbackModel", labelKey: "fallbackLabel", placeholderKey: "fallbackModel" },
    { name: "description", labelKey: "descLabel", placeholderKey: "descPlaceholder" },
    { name: "tags", labelKey: "tagsLabel", placeholderKey: "tags" },
  ],
};

const PROVIDER_LABELS = {
  anthropic: "Anthropic API",
  bedrock: "Amazon Bedrock",
  vertex: "Google Cloud Agent Platform",
  foundry: "Microsoft Foundry",
  aws: "Claude Platform on AWS",
  proxy: "OpenAI Compatible (Proxy)",
};

// 프록시 템플릿
const PROXY_TEMPLATES = [
  {
    label: "OpenAI (Direct)",
    value: "openai",
    data: {
      ANTHROPIC_BASE_URL: "https://api.openai.com/v1",
      ANTHROPIC_MODEL: "gpt-4o",
      description: "OpenAI API direct",
      tags: "proxy,openai",
    },
  },
  {
    label: "Ollama (Local)",
    value: "ollama",
    data: {
      ANTHROPIC_BASE_URL: "http://localhost:11434/v1",
      ANTHROPIC_API_KEY: "ollama",
      description: "Ollama local server",
      tags: "proxy,ollama,local",
    },
  },
  {
    label: "Groq",
    value: "groq",
    data: {
      ANTHROPIC_BASE_URL: "https://api.groq.com/openai/v1",
      ANTHROPIC_MODEL: "llama-3.3-70b-versatile",
      description: "Groq API",
      tags: "proxy,groq",
    },
  },
  {
    label: "LiteLLM (Proxy)",
    value: "litellm",
    data: {
      ANTHROPIC_BASE_URL: "http://localhost:4000",
      ANTHROPIC_API_KEY: "sk-your-litellm-key",
      description: "LiteLLM proxy",
      tags: "proxy,litellm",
    },
  },
  {
    label: "Custom",
    value: "custom",
    data: {},
  },
];

export function FormStep({ step, formData, setFormData, onNext, onPrev, onCancel, isEdit }) {
  const { t } = useI18n();
  const set = (patch) => setFormData({ ...formData, ...patch });

  // 커스텀 env 추가 (KEY=VALUE 형식)
  const [customKeyValue, setCustomKeyValue] = useState("");

  // 현재 스텝의 필드 (순차 입력)
  // proxy 공급자: meta 스텝에서 ANTHROPIC_MODEL 제외 (proxy_keys에서 이미 입력)
  const fields = (step === "meta" && formData.provider === "proxy"
    ? STEP_FIELDS.meta.filter((f) => f.name !== "ANTHROPIC_MODEL")
    : STEP_FIELDS[step] || []);
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = fields[fieldIdx];

  // 스텝이 바뀌면 필드 인덱스 리셋
  useEffect(() => {
    setFieldIdx(0);
    setCustomKeyValue("");
  }, [step]);

  // 커스텀 env 추가/삭제
  const addCustomEnv = () => {
    const trimmed = customKeyValue.trim();
    if (!trimmed) {
      // 빈 입력이면 다음 스텝 (완료)
      onNext();
      return;
    }
    // 삭제: -KEY 형식 (예: -API_TIMEOUT_MS)
    if (trimmed.startsWith("-") && !trimmed.includes("=")) {
      const delKey = trimmed.slice(1).trim();
      if (!delKey) return;
      const list = (formData.customList || []).filter((c) => c.key !== delKey);
      set({ customList: list });
      setCustomKeyValue("");
      return;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) {
      return; // 유효하지 않으면 무시 (KEY=VALUE 형식 아님)
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!key || !value) return;
    const list = formData.customList || [];
    const existing = list.findIndex((c) => c.key === key);
    if (existing >= 0) {
      list[existing] = { key, value };
    } else {
      list.push({ key, value });
    }
    set({ customList: list });
    setCustomKeyValue("");
  };

  // 필드 순차 이동
  const nextField = () => {
    if (step === "custom") {
      addCustomEnv();
      return;
    }
    if (fieldIdx < fields.length - 1) {
      setFieldIdx(fieldIdx + 1);
    } else {
      onNext();
    }
  };
  const prevField = () => {
    if (step === "custom") {
      onPrev();
      return;
    }
    if (fieldIdx > 0) {
      setFieldIdx(fieldIdx - 1);
    } else {
      onPrev();
    }
  };

  // Esc: 이전 필드로, 첫 필드면 취소
  useInput((input, key) => {
    if (key.escape) {
      if (step === "custom") {
        onPrev();
      } else if (fieldIdx > 0) setFieldIdx(fieldIdx - 1);
      else if (onCancel) onCancel();
    }
  });

  let body;
  let title;

  if (step === "provider") {
    title = t("providerStep");
    body = e(SelectInput, {
      items: PROVIDER_VALUES.map((p) => ({
        label: PROVIDER_LABELS[p.value] + " (" + t("defaultLabel") + ")",
        value: p.value,
      })),
      onSelect: (item) => {
        set({ provider: item.value });
        // 프록시 선택 시 템플릿 선택 단계로 이동
        if (item.value === "proxy") {
          setTimeout(() => onNext(), 100);
        } else {
          setTimeout(onNext, 100);
        }
      },
    });
  } else if (step === "proxy_template") {
    title = t("proxyTemplateStep");
    body = e(SelectInput, {
      items: PROXY_TEMPLATES.map((tmpl) => ({
        label: tmpl.label,
        value: tmpl.value,
      })),
      onSelect: (item) => {
        const template = PROXY_TEMPLATES.find((t) => t.value === item.value);
        if (template && template.data) {
          set({ ...template.data });
        }
        setTimeout(onNext, 100);
      },
    });
  } else if (step === "keys") {
    title = t("keysStep");
    body = e(
      Box,
      { flexDirection: "column" },
      // 현재 필드만 렌더링 (Ink focus 문제 방지)
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.primary }, t(field.labelKey)),
        formData[field.name] && isEdit
          ? e(Text, { color: colors.danger }, t("deleteHint"))
          : null
      ),
      e(TextInput, {
        value: formData[field.name] || "",
        onChange: (v) => set({ [field.name]: v }),
        onSubmit: nextField,
        placeholder: t(field.placeholderKey),
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          t("fieldIndicator", { cur: fieldIdx + 1, total: fields.length })
        )
      )
    );
  } else if (step === "proxy_keys") {
    title = t("proxyKeysStep");
    body = e(
      Box,
      { flexDirection: "column" },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.primary }, t(field.labelKey)),
        formData[field.name] && isEdit
          ? e(Text, { color: colors.danger }, t("deleteHint"))
          : null
      ),
      e(TextInput, {
        value: formData[field.name] || "",
        onChange: (v) => set({ [field.name]: v }),
        onSubmit: nextField,
        placeholder: t(field.placeholderKey),
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          t("fieldIndicator", { cur: fieldIdx + 1, total: fields.length })
        )
      )
    );
  } else if (step === "meta") {
    title = t("metaStep");
    body = e(
      Box,
      { flexDirection: "column" },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.primary }, t(field.labelKey)),
        formData[field.name] && isEdit
          ? e(Text, { color: colors.danger }, t("deleteHint"))
          : null
      ),
      e(TextInput, {
        value: formData[field.name] || "",
        onChange: (v) => set({ [field.name]: v }),
        onSubmit: nextField,
        placeholder: t(field.placeholderKey),
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          t("fieldIndicator", { cur: fieldIdx + 1, total: fields.length })
        )
      )
    );
  } else if (step === "custom") {
    title = t("customStep");
    const customList = formData.customList || [];
    body = e(
      Box,
      { flexDirection: "column" },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.muted }, t("customFormat"))
      ),
      // 현재 추가된 커스텀 env 목록
      ...customList.map((c, i) =>
        e(
          Box,
          { key: i },
          e(Text, { color: colors.warning }, "  " + c.key + "=" + c.value)
        )
      ),
      e(
        Box,
        { marginBottom: 1, marginTop: customList.length > 0 ? 1 : 0 },
        e(Text, { color: colors.primary }, t("newEnvVar"))
      ),
      e(TextInput, {
        value: customKeyValue,
        onChange: setCustomKeyValue,
        onSubmit: nextField,
        placeholder: t("customPlaceholder"),
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          customList.length > 0
            ? t("customHintWithCount", { count: customList.length })
            : t("customHint")
        )
      )
    );
  }

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "cyan",
      paddingX: 1,
      flexGrow: 1,
    },
    e(
      Box,
      { marginBottom: 1, justifyContent: "space-between" },
      e(
        Text,
        { color: colors.brand, bold: true },
        isEdit ? "✎ Edit Profile" : "✦ New Profile"
      ),
      e(Text, { color: colors.muted }, title)
    ),
    body,
    e(
      Box,
      { marginTop: 1 },
      e(Text, { color: colors.muted }, t("escCancel"))
    )
  );
}

export default FormStep;