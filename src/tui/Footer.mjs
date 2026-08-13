"use strict";
import React, { memo } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

const Footer = memo(function Footer({ hints }) {
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
    { key: "D", label: t("proxyDebug") },
    { key: "f", label: t("proxyFilter") },
    { key: "s", label: t("settings") },
    { key: "Tab", label: t("focus") },
    { key: "l", label: t("lang") },
    { key: "Esc", label: t("back") },
    { key: "q", label: t("quit") },
  ];
  const items = hints || defaultHints;

  // 힌트를 2줄로 고정 분배 (폭과 무관하게 항상 2줄 유지)
  const half = Math.ceil(items.length / 2);
  const row1 = items.slice(0, half);
  const row2 = items.slice(half);

  const renderRow = (row, keyPrefix) =>
    row.map((h, i) =>
      e(
        Text,
        { key: keyPrefix + i },
        e(Text, { backgroundColor: "gray", color: "white" }, ` ${h.key} `),
        e(Text, { color: colors.muted }, ` ${h.label}   `)
      )
    );

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "gray",
      borderTop: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      paddingX: 1,
      flexShrink: 0,
    },
    e(Text, { wrap: "truncate-end" }, ...renderRow(row1, "a")),
    e(Text, { wrap: "truncate-end" }, ...renderRow(row2, "b"))
  );
});

export default Footer;