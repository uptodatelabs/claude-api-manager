"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

export default function StatusBar({ activeProfile, view, mode, message, lang, proxyRunning, proxyProfile, proxyPort, proxyFilter }) {
  const { t } = useI18n();

  const children = [
    e(Text, { color: colors.brand, bold: true }, "✦ Claude API Manager"),
    e(Text, { color: colors.muted }, " │ "),
    activeProfile
      ? e(
          Text,
          null,
          e(Text, { color: colors.muted }, `${t("active")}: `),
          e(Text, { color: colors.success }, activeProfile)
        )
      : e(Text, { color: colors.muted }, `${t("active")}: -`),
    e(Text, { color: colors.muted }, " │ "),
    e(
      Text,
      null,
      e(Text, { color: colors.muted }, `${t("view")}: `),
      e(Text, { color: colors.primary }, view)
    ),
    e(Text, { color: colors.muted }, " │ "),
    e(Text, { color: colors.warning }, lang === "en" ? "EN" : "KO"),
  ];

  if (proxyRunning) {
    children.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.success }, `⚡ ${proxyProfile}:${proxyPort}`)
    );
  }

  if (proxyFilter) {
    children.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.warning }, "⚡ Proxy")
    );
  }

  if (mode) {
    children.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.warning }, mode)
    );
  }

  if (message) {
    const msgColor = message.type === "success"
      ? colors.success
      : message.type === "danger"
      ? colors.danger
      : colors.info;
    children.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: msgColor }, message.text)
    );
  }

  return e(
    Box,
    {
      borderStyle: "single",
      borderColor: "cyan",
      paddingX: 1,
    },
    e(Text, { wrap: "truncate-end" }, ...children)
  );
}