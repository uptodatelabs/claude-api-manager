"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

export default function StatusBar({ activeProfile, view, mode, message, lang, proxyRunning, proxyProfile, proxyPort, proxyFilter }) {
  const { t } = useI18n();
  const parts = [
    e(Text, { color: colors.brand, bold: true }, "✦ Claude API Manager"),
    e(Text, { color: colors.muted }, "│"),
    activeProfile
      ? e(
          Text,
          null,
          e(Text, { color: colors.muted }, t("active") + ": "),
          e(Text, { color: colors.success }, activeProfile)
        )
      : e(Text, { color: colors.muted }, t("active") + ": -"),
    e(Text, { color: colors.muted }, "│"),
    e(
      Text,
      null,
      e(Text, { color: colors.muted }, t("view") + ": "),
      e(Text, { color: colors.primary }, view)
    ),
    e(Text, { color: colors.muted }, "│"),
    e(Text, { color: colors.warning }, lang === "en" ? "EN" : "KO"),
  ];

  if (proxyRunning) {
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: colors.muted }, "│ "),
        e(Text, { color: colors.success }, `⚡ ${proxyProfile}:${proxyPort}`)
      )
    );
  }

  if (proxyFilter) {
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: colors.muted }, "│ "),
        e(Text, { color: colors.warning }, "⚡ Proxy filter")
      )
    );
  }

  if (mode) {
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: colors.muted }, "│ "),
        e(Text, { color: colors.warning }, mode)
      )
    );
  }

  if (message) {
    const msgColor = message.type === "success"
      ? colors.success
      : message.type === "danger"
      ? colors.danger
      : colors.info;
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: colors.muted }, "│ "),
        e(Text, { color: msgColor }, message.text)
      )
    );
  }

  return e(
    Box,
    { borderStyle: "single", borderColor: "cyan", paddingX: 1, justifyContent: "space-between" },
    e(Box, null, ...parts)
  );
}