"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

export default function Footer({ hints }) {
  const { t } = useI18n();
  // 핵심 키만 짧게 표시 (단일 Text + truncate-end로 어떤 너비에서도 한 줄)
  const defaultHints = [
    { key: "Tab", label: t("focus") },
    { key: "↑↓", label: t("move") },
    { key: "/", label: t("search") },
    { key: "↵", label: t("apply") },
    { key: "e", label: t("edit") },
    { key: "d", label: t("delete") },
    { key: "n", label: t("add") },
    { key: "p", label: t("proxy") },
    { key: "s", label: t("settings") },
    { key: "l", label: t("lang") },
    { key: "q", label: t("quit") },
  ];
  const items = hints || defaultHints;

  const children = items.map((h, i) =>
    e(
      Text,
      { key: i },
      e(Text, { backgroundColor: "gray", color: "white" }, ` ${h.keyName} `),
      e(Text, { color: colors.muted }, ` ${h.label}`)
    )
  );

  return e(
    Box,
    {
      borderStyle: "single",
      borderColor: "gray",
      borderTop: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      paddingX: 1,
    },
    e(Text, { wrap: "truncate-end" }, ...children)
  );
}