"use strict";
import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.mjs";

const e = React.createElement;

function Key({ label, keyName }) {
  return e(
    Box,
    { marginRight: 1 },
    e(Text, { backgroundColor: "gray", color: "white" }, " ", keyName, " "),
    e(Text, { color: "gray" }, " " + label)
  );
}

export default function Footer({ hints }) {
  const defaultHints = [
    { key: "↑↓", label: "이동" },
    { key: "/", label: "검색" },
    { key: "↵", label: "선택" },
    { key: "a", label: "적용" },
    { key: "e", label: "수정" },
    { key: "d", label: "삭제" },
    { key: "n", label: "추가" },
    { key: "?", label: "도움" },
    { key: "q", label: "종료" },
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