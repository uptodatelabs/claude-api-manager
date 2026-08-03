"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { colors, providerName } from "./theme.mjs";

const e = React.createElement;

export const PROVIDERS = [
  { label: "Anthropic API (기본)", value: "anthropic" },
  { label: "Amazon Bedrock", value: "bedrock" },
  { label: "Google Cloud Agent Platform", value: "vertex" },
  { label: "Microsoft Foundry", value: "foundry" },
  { label: "Claude Platform on AWS", value: "aws" },
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

// 각 스텝의 입력 필드 정의 (순차 입력)
const STEP_FIELDS = {
  keys: [
    { name: "ANTHROPIC_API_KEY", label: "ANTHROPIC_API_KEY", placeholder: "API 키 (없으면 Enter)" },
    { name: "ANTHROPIC_AUTH_TOKEN", label: "ANTHROPIC_AUTH_TOKEN", placeholder: "Bearer 토큰 (없으면 Enter)" },
    { name: "ANTHROPIC_BASE_URL", label: "ANTHROPIC_BASE_URL", placeholder: "프록시/게이트웨이 URL (없으면 Enter)" },
    { name: "AWS_REGION", label: "AWS_REGION", placeholder: "us-east-1 (없으면 Enter)" },
  ],
  meta: [
    { name: "ANTHROPIC_MODEL", label: "ANTHROPIC_MODEL", placeholder: "opus, sonnet, claude-sonnet-4-5-20250514" },
    { name: "fallbackModel", label: "fallbackModel (쉼표 구분)", placeholder: "claude-sonnet-5,claude-haiku-4-5" },
    { name: "description", label: "설명", placeholder: "이 프로필의 용도/메모" },
    { name: "tags", label: "태그 (쉼표 구분)", placeholder: "work, proxy, ollama" },
  ],
};

export function FormStep({ step, formData, setFormData, onNext, onPrev, onCancel, isEdit }) {
  const set = (patch) => setFormData({ ...formData, ...patch });

  // 커스텀 env 추가 (KEY=VALUE 형식)
  const [customKeyValue, setCustomKeyValue] = useState("");

  // 현재 스텝의 필드 (순차 입력)
  const fields = STEP_FIELDS[step] || [];
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = fields[fieldIdx];

  // 스텝이 바뀌면 필드 인덱스 리셋
  useEffect(() => {
    setFieldIdx(0);
    setCustomKeyValue("");
  }, [step]);

  // 커스텀 env 추가
  const addCustomEnv = () => {
    const trimmed = customKeyValue.trim();
    if (!trimmed) {
      // 빈 입력이면 다음 스텝 (완료)
      onNext();
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
    title = "Step 1/4: API 공급자";
    body = e(SelectInput, {
      items: PROVIDERS,
      onSelect: (item) => {
        set({ provider: item.value });
        setTimeout(onNext, 100);
      },
    });
  } else if (step === "keys") {
    title = "Step 2/4: 키 및 엔드포인트";
    body = e(
      Box,
      { flexDirection: "column" },
      // 현재 필드만 렌더링 (Ink focus 문제 방지)
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.primary }, field.label),
        formData[field.name] && isEdit
          ? e(Text, { color: colors.danger }, " (- 입력 시 삭제)")
          : null
      ),
      e(TextInput, {
        value: formData[field.name] || "",
        onChange: (v) => set({ [field.name]: v }),
        onSubmit: nextField,
        placeholder: field.placeholder,
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          `필드 ${fieldIdx + 1}/${fields.length} — [Enter] 다음  [Esc] 이전`
        )
      )
    );
  } else if (step === "meta") {
    title = "Step 3/4: 모델 및 메타";
    body = e(
      Box,
      { flexDirection: "column" },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.primary }, field.label),
        formData[field.name] && isEdit
          ? e(Text, { color: colors.danger }, " (- 입력 시 삭제)")
          : null
      ),
      e(TextInput, {
        value: formData[field.name] || "",
        onChange: (v) => set({ [field.name]: v }),
        onSubmit: nextField,
        placeholder: field.placeholder,
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          `필드 ${fieldIdx + 1}/${fields.length} — [Enter] 다음  [Esc] 이전`
        )
      )
    );
  } else if (step === "custom") {
    title = "Step 4/4: 커스텀 환경변수 (선택)";
    const customList = formData.customList || [];
    body = e(
      Box,
      { flexDirection: "column" },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.muted }, "KEY=VALUE 형식으로 입력, 빈 값 입력 시 완료")
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
        e(Text, { color: colors.primary }, "새 환경변수 (KEY=VALUE)")
      ),
      e(TextInput, {
        value: customKeyValue,
        onChange: setCustomKeyValue,
        onSubmit: nextField,
        placeholder: "예: API_TIMEOUT_MS=600000 (비우면 완료)",
      }),
      e(
        Box,
        { marginTop: 1 },
        e(
          Text,
          { color: colors.muted },
          customList.length > 0
            ? `추가됨 ${customList.length}개 — [Enter] 추가  [Enter] 빈값 완료  [Esc] 이전`
            : "[Enter] 추가  [Enter] 빈값 완료  [Esc] 이전"
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
      e(Text, { color: colors.muted }, "[Esc] 취소")
    )
  );
}

export default FormStep;