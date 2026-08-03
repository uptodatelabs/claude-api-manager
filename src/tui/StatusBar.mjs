"use strict";
import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.mjs";

const e = React.createElement;

export default function StatusBar({ activeProfile, view, mode, message }) {
  const parts = [
    theme.brand("✦ Claude API Manager"),
    theme.muted("│"),
    activeProfile
      ? e(Text, { key: "ap" }, theme.muted("active: "), theme.success(activeProfile))
      : e(Text, { key: "ap", color: "gray" }, "active: -"),
    theme.muted("│"),
    e(Text, { key: "vw" }, theme.muted("view: "), theme.primary(view)),
  ];

  if (mode) {
    parts.push(e(Text, { key: "md" }, theme.muted("│ "), theme.warning(mode)));
  }

  if (message) {
    parts.push(e(Text, { key: "msg" }, theme.muted("│ "), theme.info(message)));
  }

  return e(
    Box,
    { borderStyle: "single", borderColor: "cyan", paddingX: 1, justifyContent: "space-between" },
    e(Box, null, ...parts)
  );
}