"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";

const e = React.createElement;

export default function StatusBar({ activeProfile, view, mode, message }) {
  const parts = [
    e(Text, { color: colors.brand, bold: true }, "✦ Claude API Manager"),
    e(Text, { color: colors.muted }, "│"),
    activeProfile
      ? e(
          Text,
          null,
          e(Text, { color: colors.muted }, "active: "),
          e(Text, { color: colors.success }, activeProfile)
        )
      : e(Text, { color: colors.muted }, "active: -"),
    e(Text, { color: colors.muted }, "│"),
    e(
      Text,
      null,
      e(Text, { color: colors.muted }, "view: "),
      e(Text, { color: colors.primary }, view)
    ),
  ];

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