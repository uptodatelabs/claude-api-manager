"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";

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
  const defaultHints = [
    { key: "Tab", label: "포커스" },
    { key: "↑↓", label: "이동" },
    { key: "/", label: "검색" },
    { key: "↵", label: "선택" },
    { key: "a", label: "적용" },
    { key: "e", label: "수정" },
    { key: "r", label: "이름변경" },
    { key: "d", label: "삭제" },
    { key: "n", label: "추가" },
    { key: "s", label: "설정보기" },
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