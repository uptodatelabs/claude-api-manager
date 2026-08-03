"use strict";
const React = require("react");
const { Box, Text } = require("ink");
const { theme } = require("./theme");

function Key({ label, keyName }) {
  return React.createElement(Box, { marginRight: 1 },
    React.createElement(Text, { backgroundColor: "gray", color: "white" }, " ", keyName, " "),
    " ",
    React.createElement(Text, { color: "gray" }, label)
  );
}

function Footer({ hints }) {
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
  return React.createElement(Box, {
    borderStyle: "single",
    borderColor: "gray",
    borderTop: true,
    borderBottom: false,
    borderLeft: false,
    borderRight: false,
    paddingX: 1,
  },
    ...items.map((h, i) => React.createElement(Key, { key: i, label: h.label, keyName: h.key }))
  );
}

module.exports = Footer;