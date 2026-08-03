"use strict";
import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.mjs";

const e = React.createElement;

export default function StatusBar({ activeProfile, view, mode, message }) {
  const parts = [
    e(Text, null, theme.brand("✦ Claude API Manager")),
    e(Text, { color: "gray" }, "│"),
    activeProfile
      ? e(
          Text,
          null,
          e(Text, { color: "gray" }, "active: "),
          e(Text, { color: "green" }, activeProfile)
        )
      : e(Text, { color: "gray" }, "active: -"),
    e(Text, { color: "gray" }, "│"),
    e(
      Text,
      null,
      e(Text, { color: "gray" }, "view: "),
      e(Text, { color: "cyan" }, view)
    ),
  ];

  if (mode) {
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: "gray" }, "│ "),
        e(Text, { color: "yellow" }, mode)
      )
    );
  }

  if (message) {
    parts.push(
      e(
        Text,
        null,
        e(Text, { color: "gray" }, "│ "),
        e(Text, { color: "blue" }, message)
      )
    );
  }

  return e(
    Box,
    { borderStyle: "single", borderColor: "cyan", paddingX: 1, justifyContent: "space-between" },
    e(Box, null, ...parts)
  );
}