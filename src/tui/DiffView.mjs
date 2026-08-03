"use strict";
import React from "react";
import { Box, Text } from "ink";
import { theme, mask } from "./theme.mjs";

const e = React.createElement;

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

export default function DiffView({ profile, current }) {
  const profileEnv = (profile && profile.env) || {};
  const currentEnv = (current && current.env) || {};

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, value] of Object.entries(profileEnv)) {
    if (!(key in currentEnv)) {
      added.push({ key, value });
    } else if (currentEnv[key] !== value) {
      changed.push({ key, value, oldValue: currentEnv[key] });
    }
  }
  for (const key of Object.keys(currentEnv)) {
    if (!(key in profileEnv)) {
      removed.push({ key, value: currentEnv[key] });
    }
  }

  const modelChanges = [];
  if (profile.model !== undefined && profile.model !== current.model) {
    modelChanges.push({
      key: "model",
      newValue: profile.model || "(삭제)",
      oldValue: current.model || "(없음)",
    });
  }
  if (profile.fallbackModel !== undefined) {
    const cur = JSON.stringify(current.fallbackModel || null);
    const next = JSON.stringify(profile.fallbackModel || null);
    if (cur !== next) {
      modelChanges.push({
        key: "fallbackModel",
        newValue: profile.fallbackModel ? profile.fallbackModel.join(", ") : "(삭제)",
        oldValue: current.fallbackModel ? current.fallbackModel.join(", ") : "(없음)",
      });
    }
  }

  const isEmpty =
    added.length === 0 &&
    removed.length === 0 &&
    changed.length === 0 &&
    modelChanges.length === 0;

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "yellow",
      paddingX: 1,
      flexGrow: 1,
    },
    e(
      Box,
      { marginBottom: 1 },
      e(Text, null, theme.warning.bold("⚡ Diff Preview")),
      e(Text, { color: "gray" }, " (apply 시 settings.json 변경 사항)")
    ),

    isEmpty
      ? e(
          Box,
          { paddingY: 1 },
          e(Text, { color: "green" }, "  변경 사항 없음")
        )
      : null,

    ...added.map((it, i) =>
      e(
        Box,
        { key: "a" + i },
        e(Text, { color: "green" }, "  + "),
        e(Text, { color: "green" }, it.key),
        e(Text, null, " = "),
        e(Text, { color: "green" }, isSensitive(it.key) ? mask(it.value) : it.value)
      )
    ),

    ...removed.map((it, i) =>
      e(
        Box,
        { key: "r" + i },
        e(Text, { color: "red" }, "  - "),
        e(Text, { color: "red" }, it.key),
        e(Text, null, " = "),
        e(Text, { color: "red" }, isSensitive(it.key) ? mask(it.value) : it.value)
      )
    ),

    ...changed.map((it, i) =>
      e(
        Box,
        { key: "c" + i, flexDirection: "column" },
        e(
          Box,
          null,
          e(Text, { color: "yellow" }, "  ~ "),
          e(Text, { color: "yellow" }, it.key)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: "red" }, "- "),
          e(Text, { color: "red" }, isSensitive(it.key) ? mask(it.oldValue) : it.oldValue)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: "green" }, "+ "),
          e(Text, { color: "green" }, isSensitive(it.key) ? mask(it.value) : it.value)
        )
      )
    ),

    ...modelChanges.map((it, i) =>
      e(
        Box,
        { key: "m" + i, flexDirection: "column" },
        e(
          Box,
          null,
          e(Text, { color: "yellow" }, "  ~ "),
          e(Text, { color: "yellow" }, it.key)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: "red" }, "- "),
          e(Text, { color: "red" }, it.oldValue)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: "green" }, "+ "),
          e(Text, { color: "green" }, it.newValue)
        )
      )
    ),

    e(
      Box,
      { marginTop: 1 },
      e(Text, { color: "gray" }, "  [Enter] 적용   [Esc] 취소")
    )
  );
}