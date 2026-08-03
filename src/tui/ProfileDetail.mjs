"use strict";
import React from "react";
import { Box, Text } from "ink";
import { theme, mask, providerName, detectProvider } from "./theme.mjs";

const e = React.createElement;

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

function formatValue(key, value) {
  if (isSensitive(key)) return theme.muted(mask(value));
  return theme.primary(value);
}

export default function ProfileDetail({ profile, isActive }) {
  if (!profile) {
    return e(
      Box,
      { flexDirection: "column", paddingX: 1 },
      e(Box, { marginBottom: 1 }, e(Text, null, theme.brand("✦ Profile Detail"))),
      e(
        Box,
        { paddingY: 2, paddingX: 2, borderStyle: "round", borderColor: "gray" },
        e(Text, { color: "gray" }, "프로파일을 선택하세요")
      )
    );
  }

  const provider = detectProvider(profile.env);
  const env = profile.env || {};
  const keys = Object.keys(env);

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
        Box,
        null,
        e(Text, null, theme.brand("✦ ")),
        e(Text, null, theme.primary.bold(profile.name)),
        isActive
          ? e(Text, { backgroundColor: "green", color: "white" }, " ACTIVE ")
          : e(Text, { backgroundColor: "gray", color: "white" }, " INACTIVE ")
      ),
      e(Text, { color: "gray" }, providerName(provider))
    ),

    profile.description
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: "gray" }, "설명: "),
          e(Text, null, profile.description)
        )
      : null,

    profile.tags && profile.tags.length > 0
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: "gray" }, "태그: "),
          ...profile.tags.map((t, i) =>
            e(
              React.Fragment,
              { key: i },
              e(Text, { backgroundColor: "yellow", color: "black" }, " " + t + " "),
              e(Text, null, " ")
            )
          )
        )
      : null,

    profile.lastApplied
      ? e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: "gray" }, "마지막 적용: "),
          e(Text, null, profile.lastApplied),
          profile.applyCount
            ? e(Text, { color: "gray" }, " (" + profile.applyCount + "회)")
            : null
        )
      : null,

    e(
      Box,
      { marginTop: 1, marginBottom: 1 },
      e(Text, null, theme.brand("─ Environment Variables ─"))
    ),

    keys.length === 0
      ? e(Text, { color: "gray" }, "  (없음)")
      : keys.map((k, i) =>
          e(
            Box,
            { key: i },
            e(Text, { color: "gray" }, "  "),
            e(Text, { color: "cyan" }, k.padEnd(35, " ")),
            e(Text, null, " = "),
            formatValue(k, env[k])
          )
        ),

    profile.model
      ? e(
          Box,
          { marginTop: 1 },
          e(Text, { color: "yellow" }, "model:        "),
          e(Text, null, profile.model)
        )
      : null,

    profile.fallbackModel
      ? e(
          Box,
          null,
          e(Text, { color: "yellow" }, "fallbackModel:"),
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