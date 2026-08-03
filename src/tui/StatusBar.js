"use strict";
const React = require("react");
const { Box, Text } = require("ink");
const { theme } = require("./theme");

function StatusBar({ activeProfile, view, mode, message }) {
  const parts = [
    theme.brand("✦ Claude API Manager"),
    theme.muted("│"),
    activeProfile
      ? React.createElement(Text, null,
          theme.muted("active: "),
          theme.success(activeProfile))
      : React.createElement(Text, { color: "gray" }, "active: -"),
    theme.muted("│"),
    React.createElement(Text, null,
      theme.muted("view: "),
      theme.primary(view)),
    mode && React.createElement(Text, null,
      theme.muted("│ "),
      theme.warning(mode)),
  ];

  if (message) {
    parts.push(React.createElement(Text, null, theme.muted("│ "), theme.info(message)));
  }

  return React.createElement(Box, {
    borderStyle: "single",
    borderColor: "cyan",
    paddingX: 1,
    justifyContent: "space-between",
  },
    React.createElement(Box, null, ...parts)
  );
}

module.exports = StatusBar;