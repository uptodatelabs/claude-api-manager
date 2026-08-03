"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors, mask } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

export default function DiffView({ profile, current, borderColor }) {
  const { t } = useI18n();
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

  const delLabel = t("deleted");
  const noneLabel = t("none");
  const modelChanges = [];
  if (profile.model !== undefined && profile.model !== current.model) {
    modelChanges.push({
      key: "model",
      newValue: profile.model || delLabel,
      oldValue: current.model || noneLabel,
    });
  }
  if (profile.fallbackModel !== undefined) {
    const cur = JSON.stringify(current.fallbackModel || null);
    const next = JSON.stringify(profile.fallbackModel || null);
    if (cur !== next) {
      modelChanges.push({
        key: "fallbackModel",
        newValue: profile.fallbackModel ? profile.fallbackModel.join(", ") : delLabel,
        oldValue: current.fallbackModel ? current.fallbackModel.join(", ") : noneLabel,
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
      borderColor: borderColor || "yellow",
      paddingX: 1,
      flexGrow: 1,
    },
    e(
      Box,
      { marginBottom: 1 },
      e(Text, { color: colors.warning, bold: true }, "⚡ Diff Preview"),
      e(Text, { color: colors.muted }, t("diffSubtitle"))
    ),

    isEmpty
      ? e(
          Box,
          { paddingY: 1 },
          e(Text, { color: colors.success }, "  " + t("noChanges"))
        )
      : null,

    ...added.map((it, i) =>
      e(
        Box,
        { key: "a" + i },
        e(Text, { color: colors.success }, "  + "),
        e(Text, { color: colors.success }, it.key),
        e(Text, null, " = "),
        e(
          Text,
          { color: colors.success },
          isSensitive(it.key) ? mask(it.value) : it.value
        )
      )
    ),

    ...removed.map((it, i) =>
      e(
        Box,
        { key: "r" + i },
        e(Text, { color: colors.danger }, "  - "),
        e(Text, { color: colors.danger }, it.key),
        e(Text, null, " = "),
        e(
          Text,
          { color: colors.danger },
          isSensitive(it.key) ? mask(it.value) : it.value
        )
      )
    ),

    ...changed.map((it, i) =>
      e(
        Box,
        { key: "c" + i, flexDirection: "column" },
        e(
          Box,
          null,
          e(Text, { color: colors.warning }, "  ~ "),
          e(Text, { color: colors.warning }, it.key)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: colors.danger }, "- "),
          e(
            Text,
            { color: colors.danger },
            isSensitive(it.key) ? mask(it.oldValue) : it.oldValue
          )
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: colors.success }, "+ "),
          e(
            Text,
            { color: colors.success },
            isSensitive(it.key) ? mask(it.value) : it.value
          )
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
          e(Text, { color: colors.warning }, "  ~ "),
          e(Text, { color: colors.warning }, it.key)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: colors.danger }, "- "),
          e(Text, { color: colors.danger }, it.oldValue)
        ),
        e(
          Box,
          { paddingLeft: 5 },
          e(Text, { color: colors.success }, "+ "),
          e(Text, { color: colors.success }, it.newValue)
        )
      )
    ),

    e(
      Box,
      { marginTop: 1 },
      e(Text, { color: colors.muted }, t("applyCancel"))
    )
  );
}