"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

const e = React.createElement;

function Key({ label, keyName }) {
  return e(
    Box,
    { marginRight: 1 },
    e(Text, { backgroundColor: "gray", color: "white" }, " " + keyName + " "),
    e(Text, { color: colors.muted }, " " + label)
  );
}

export default function Footer({ hints }) {
  const { t } = useI18n();
  const defaultHints = [
    { key: "Tab", label: t("focus") },
    { key: "↑↓", label: t("move") },
    { key: "/", label: t("search") },
    { key: "↵", label: t("select") },
    { key: "a", label: t("apply") },
    { key: "e", label: t("edit") },
    { key: "r", label: t("rename") },
    { key: "d", label: t("delete") },
    { key: "n", label: t("add") },
    { key: "p", label: t("proxy") },
    { key: "f", label: t("proxyFilter") },
    { key: "s", label: t("settings") },
    { key: "l", label: t("lang") },
    { key: "q", label: t("quit") },
  ];
  const items = hints || defaultHints;
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
    ...items.map((h, i) => e(Key, { key: i, label: h.label, keyName: h.key }))
  );
}