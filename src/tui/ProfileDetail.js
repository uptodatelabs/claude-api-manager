"use strict";
const React = require("react");
const { Box, Text } = require("ink");
const { theme, mask, providerName, detectProvider } = require("./theme");

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

function formatValue(key, value) {
  if (isSensitive(key)) return theme.muted(mask(value));
  return theme.primary(value);
}

function ProfileDetail({ profile, isActive }) {
  if (!profile) {
    return React.createElement(Box, { flexDirection: "column", paddingX: 1 },
      React.createElement(Box, { marginBottom: 1 },
        theme.brand("✦ Profile Detail")
      ),
      React.createElement(Box, { paddingY: 2, paddingX: 2,
        borderStyle: "round", borderColor: "gray" },
        React.createElement(Text, { color: "gray" },
          "프로파일을 선택하세요"
        )
      )
    );
  }

  const provider = detectProvider(profile.env);
  const env = profile.env || {};
  const keys = Object.keys(env);

  return React.createElement(Box, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "cyan",
    paddingX: 1,
    flexGrow: 1,
  },
    React.createElement(Box, { marginBottom: 1, justifyContent: "space-between" },
      React.createElement(Box, null,
        theme.brand("✦ "),
        theme.primary.bold(profile.name),
        isActive
          ? React.createElement(Text, { backgroundColor: "green", color: "white" }, " ACTIVE ")
          : React.createElement(Text, { backgroundColor: "gray", color: "white" }, " INACTIVE ")
      ),
      React.createElement(Text, { color: "gray" }, providerName(provider))
    ),

    profile.description
      ? React.createElement(Box, { marginBottom: 1 },
          theme.subtle("설명: "),
          React.createElement(Text, null, profile.description))
      : null,

    profile.tags && profile.tags.length > 0
      ? React.createElement(Box, { marginBottom: 1 },
          theme.subtle("태그: "),
          ...profile.tags.map((t, i) => [
            React.createElement(Text, { key: i, backgroundColor: "yellow", color: "black" }, " ", t, " "),
            React.createElement(Text, { key: i + "s" }, " "),
          ])
        )
      : null,

    profile.lastApplied
      ? React.createElement(Box, { marginBottom: 1 },
          theme.subtle("마지막 적용: "),
          React.createElement(Text, null, profile.lastApplied),
          profile.applyCount
            ? React.createElement(Text, { color: "gray" }, ` (${profile.applyCount}회)`)
            : null
        )
      : null,

    React.createElement(Box, { marginTop: 1, marginBottom: 1 },
      theme.brand("─ Environment Variables ─")
    ),

    keys.length === 0
      ? React.createElement(Text, { color: "gray" }, "  (없음)")
      : keys.map((k, i) => React.createElement(Box, { key: i },
          theme.subtle("  "),
          React.createElement(Text, { color: "cyan" }, k.padEnd(35, " ")),
          " = ",
          formatValue(k, env[k])
        )),

    profile.model
      ? React.createElement(Box, { marginTop: 1 },
          theme.warning("model:        "),
          React.createElement(Text, null, profile.model))
      : null,

    profile.fallbackModel
      ? React.createElement(Box, null,
          theme.warning("fallbackModel:"),
          React.createElement(Text, null,
            " ",
            Array.isArray(profile.fallbackModel)
              ? profile.fallbackModel.join(", ")
              : profile.fallbackModel))
      : null
  );
}

module.exports = ProfileDetail;