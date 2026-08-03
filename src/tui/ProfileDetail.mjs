"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors, mask, providerName, detectProvider } from "./theme.mjs";

const e = React.createElement;

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

function EnvRow({ keyName, value }) {
  const masked = isSensitive(keyName);
  return e(
    Box,
    null,
    e(Text, { color: colors.muted }, "  "),
    e(Text, { color: "cyan" }, keyName.padEnd(35, " ")),
    e(Text, null, " = "),
    masked
      ? e(Text, { color: colors.muted }, mask(value))
      : e(Text, { color: colors.primary }, value)
  );
}

export default function ProfileDetail({ profile, isActive, borderColor }) {
  if (!profile) {
    return e(
      Box,
      { flexDirection: "column", paddingX: 1 },
      e(
        Box,
        { marginBottom: 1 },
        e(Text, { color: colors.brand, bold: true }, "✦ Profile Detail")
      ),
      e(
        Box,
        { paddingY: 2, paddingX: 2, borderStyle: "round", borderColor: borderColor || "gray" },
        e(Text, { color: colors.muted }, "프로파일을 선택하세요")
      )
    );
  }

  const env = profile.env || {};
  const keys = Object.keys(env);

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: borderColor || "cyan",
      paddingX: 1,
      flexGrow: 1,
    },
    e(
      Box,
      { marginBottom: 1, justifyContent: "space-between" },
      e(
        Box,
        null,
        e(Text, { color: colors.brand }, "✦ "),
        e(Text, { color: colors.primary, bold: true }, profile.name),
        isActive
          ? e(Text, { backgroundColor: colors.success, color: "white" }, " ACTIVE ")
          : e(Text, { backgroundColor: "gray", color: "white" }, " INACTIVE ")
      ),
      e(Text, { color: colors.muted }, providerName(provider))
    ),

    profile.description
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, "설명: "),
          e(Text, null, profile.description)
        )
      : null,

    profile.tags && profile.tags.length > 0
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, "태그: "),
          ...profile.tags.map((t, i) =>
            e(
              React.Fragment,
              { key: i },
              e(Text, { backgroundColor: colors.warning, color: "black" }, " " + t + " "),
              e(Text, null, " ")
            )
          )
        )
      : null,

    profile.lastApplied
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, "마지막 적용: "),
          e(Text, null, profile.lastApplied),
          profile.applyCount
            ? e(Text, { color: colors.muted }, " (" + profile.applyCount + "회)")
            : null
        )
      : null,

    e(
      Box,
      { marginTop: 1, marginBottom: 1 },
      e(Text, { color: colors.brand }, "─ Environment Variables ─")
    ),

    keys.length === 0
      ? e(Text, { color: colors.muted }, "  (없음)")
      : keys.map((k, i) => e(EnvRow, { key: i, keyName: k, value: env[k] })),

    profile.model
      ? e(
          Box,
          { marginTop: 1 },
          e(Text, { color: colors.warning }, "model:        "),
          e(Text, null, profile.model)
        )
      : null,

    profile.fallbackModel
      ? e(
          Box,
          null,
          e(Text, { color: colors.warning }, "fallbackModel:"),
          e(
            Text,
            null,
            " " +
              (Array.isArray(profile.fallbackModel)
                ? profile.fallbackModel.join(", ")
                : profile.fallbackModel)
          )
        )
      : null
  );
}