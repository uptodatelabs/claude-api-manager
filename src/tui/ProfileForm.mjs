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

  // 현재 스텝의 필드 (순차 입력)
  const fields = STEP_FIELDS[step] || [];
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = fields[fieldIdx];

  // 스텝이 바뀌면 필드 인덱스 리셋
  useEffect(() => {
    setFieldIdx(0);
  }, [step]);

  // 필드 순차 이동
  const nextField = () => {
    if (fieldIdx < fields.length - 1) {
      setFieldIdx(fieldIdx + 1);
    } else {
      onNext();
    }
  };
  const prevField = () => {
    if (fieldIdx > 0) {
      setFieldIdx(fieldIdx - 1);
    } else {
      onPrev();
    }
  };

  // Esc: 이전 필드로, 첫 필드면 취소
  useInput((input, key) => {
    if (key.escape) {
      if (fieldIdx > 0) setFieldIdx(fieldIdx - 1);
      else if (onCancel) onCancel();
    }
  });

  let body;
  let title;

  if (step === "provider") {
    title = "Step 1/3: API 공급자";
    body = e(SelectInput, {
      items: PROVIDERS,
      onSelect: (item) => {
        set({ provider: item.value });
        setTimeout(onNext, 100);
      },
    });
  } else if (step === "keys" || step === "meta") {
    title = step === "keys" ? "Step 2/3: 키 및 엔드포인트" : "Step 3/3: 모델 및 메타";
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