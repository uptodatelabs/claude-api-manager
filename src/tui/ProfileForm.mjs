"use strict";
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { theme, providerName } from "./theme.mjs";

const e = React.createElement;

export const PROVIDERS = [
  { label: "Anthropic API (기본)", value: "anthropic" },
  { label: "Amazon Bedrock", value: "bedrock" },
  { label: "Google Cloud Agent Platform", value: "vertex" },
  { label: "Microsoft Foundry", value: "foundry" },
  { label: "Claude Platform on AWS", value: "aws" },
];

export function Field({ label, value, onChange, placeholder, isEdit, hasExisting, focus }) {
  return e(
    Box,
    { flexDirection: "column", marginBottom: 1 },
    e(
      Box,
      null,
      e(Text, { color: "cyan" }, label),
      hasExisting && isEdit ? e(Text, { color: "red" }, " (- 입력 시 삭제)") : null
    ),
    e(TextInput, { value, onChange, placeholder, focus })
  );
}

export function FormStep({ step, formData, setFormData, onNext, onPrev, isEdit }) {
  const set = (patch) => setFormData({ ...formData, ...patch });

  let body;
  let title;

  switch (step) {
    case "provider":
      title = "Step 1/3: API 공급자";
      body = e(SelectInput, {
        items: PROVIDERS,
        onSelect: (item) => {
          set({ provider: item.value });
          setTimeout(onNext, 100);
        },
      });
      break;

    case "keys":
      title = "Step 2/3: 키 및 엔드포인트";
      body = e(
        React.Fragment,
        null,
        e(Field, {
          label: "ANTHROPIC_API_KEY",
          value: formData.ANTHROPIC_API_KEY || "",
          onChange: (v) => set({ ANTHROPIC_API_KEY: v }),
          isEdit,
          hasExisting: !!formData.ANTHROPIC_API_KEY,
          focus: true,
        }),
        e(Field, {
          label: "ANTHROPIC_AUTH_TOKEN",
          value: formData.ANTHROPIC_AUTH_TOKEN || "",
          onChange: (v) => set({ ANTHROPIC_AUTH_TOKEN: v }),
          isEdit,
          hasExisting: !!formData.ANTHROPIC_AUTH_TOKEN,
          placeholder: "Bearer 토큰",
        }),
        e(Field, {
          label: "ANTHROPIC_BASE_URL",
          value: formData.ANTHROPIC_BASE_URL || "",
          onChange: (v) => set({ ANTHROPIC_BASE_URL: v }),
          isEdit,
          hasExisting: !!formData.ANTHROPIC_BASE_URL,
          placeholder: "프록시/게이트웨이 URL",
        }),
        e(Field, {
          label: "AWS_REGION (Bedrock/Vertex/AWS)",
          value: formData.AWS_REGION || "",
          onChange: (v) => set({ AWS_REGION: v }),
          isEdit,
          hasExisting: !!formData.AWS_REGION,
          placeholder: "us-east-1",
        })
      );
      break;

    case "meta":
      title = "Step 3/3: 모델 및 메타";
      body = e(
        React.Fragment,
        null,
        e(Field, {
          label: "ANTHROPIC_MODEL",
          value: formData.ANTHROPIC_MODEL || "",
          onChange: (v) => set({ ANTHROPIC_MODEL: v }),
          isEdit,
          hasExisting: !!formData.ANTHROPIC_MODEL,
          focus: true,
          placeholder: "opus, sonnet, claude-sonnet-4-5-20250514",
        }),
        e(Field, {
          label: "fallbackModel (쉼표 구분)",
          value: formData.fallbackModel || "",
          onChange: (v) => set({ fallbackModel: v }),
          isEdit,
          hasExisting: !!formData.fallbackModel,
          placeholder: "claude-sonnet-5,claude-haiku-4-5",
        }),
        e(Field, {
          label: "설명",
          value: formData.description || "",
          onChange: (v) => set({ description: v }),
          isEdit,
          hasExisting: !!formData.description,
          placeholder: "이 프로필의 용도/메모",
        }),
        e(Field, {
          label: "태그 (쉼표 구분)",
          value: formData.tags || "",
          onChange: (v) => set({ tags: v }),
          isEdit,
          hasExisting: !!formData.tags,
          placeholder: "work, proxy, ollama",
        })
      );
      break;
  }

  return e(
    Box,
    { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1, flexGrow: 1 },
    e(
      Box,
      { marginBottom: 1, justifyContent: "space-between" },
      e(Text, null, theme.brand(isEdit ? "✎ Edit Profile" : "✦ New Profile")),
      e(Text, { color: "gray" }, title)
    ),
    body,
    e(Box, { marginTop: 1 }, e(Text, { color: "gray" }, "[Enter] 다음   [Esc] 취소"))
  );
}

export default FormStep;