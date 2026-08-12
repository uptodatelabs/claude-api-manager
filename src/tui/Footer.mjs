"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

export default function Footer({ hints }) {
  const { t } = useI18n();
  // 전체 명령어 표시 (모든 키 안내)
  const defaultHints = [
    { key: "↑↓", label: t("move") },
    { key: "j/k", label: t("scroll") },
    { key: "PgUp/Dn", label: t("page") },
    { key: "g/G", label: t("topBottom") },
    { key: "/", label: t("search") },
    { key: "↵/a", label: t("apply") },
    { key: "e", label: t("edit") },
    { key: "r", label: t("rename") },
    { key: "d", label: t("delete") },
    { key: "n", label: t("add") },
    { key: "c", label: t("capture") },
    { key: "i", label: t("import") },
    { key: "x", label: t("export") },
    { key: "p", label: t("proxy") },
    { key: "f", label: t("proxyFilter") },
    { key: "s", label: t("settings") },
    { key: "Tab", label: t("focus") },
    { key: "l", label: t("lang") },
    { key: "Esc", label: t("back") },
    { key: "q", label: t("quit") },
  ];
  const items = hints || defaultHints;

  const children = items.map((h, i) =>
    e(
      Text,
      { key: i },
      e(Text, { backgroundColor: "gray", color: "white" }, ` ${h.key} `),
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
    e(Text, { wrap: "wrap" }, ...children)
  );
}