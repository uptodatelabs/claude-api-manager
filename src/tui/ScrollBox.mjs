"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";

const e = React.createElement;

function getTerminalRows() {
  return process.stdout.rows || 30;
}

export default function ScrollBox({ children, scroll = 0, heightOffset = 0 }) {
  const [rows, setRows] = useState(getTerminalRows());

  useEffect(() => {
    const onResize = () => setRows(getTerminalRows());
    process.stdout.on("resize", onResize);
    return () => process.stdout.off("resize", onResize);
  }, []);

  const availableHeight = Math.max(1, rows - heightOffset);

  return e(
    Box,
    {
      flexDirection: "column",
      height: availableHeight,
      overflowY: "hidden",
      flexGrow: 0,
    },
    e(
      Box,
      {
        flexDirection: "column",
        flexShrink: 0,
        marginTop: -scroll,
      },
      children
    )
  );
}