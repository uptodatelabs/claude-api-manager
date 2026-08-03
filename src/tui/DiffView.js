"use strict";
const React = require("react");
const { Box, Text } = require("ink");
const { theme, mask } = require("./theme");

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

function DiffView({ profile, current }) {
  const profileEnv = (profile && profile.env) || {};
  const currentEnv = (current && current.env) || {};

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, value] of Object.entries(profileEnv)) {
    if (!(key in currentEnv)) {
      added.push({ key, value });
    } else if (currentEnv[key] !== value) {
      changed.push({ key, value, oldValue: currentEnv[key] });
    }
  }
  for (const key of Object.keys(currentEnv)) {
    if (!(key in profileEnv)) {
      removed.push({ key, value: currentEnv[key] });
    }
  }

  const modelChanges = [];
  if (profile.model !== undefined && profile.model !== current.model) {
    modelChanges.push({
      key: "model",
      newValue: profile.model || "(삭제)",
      oldValue: current.model || "(없음)",
    });
  }
  if (profile.fallbackModel !== undefined) {
    const cur = JSON.stringify(current.fallbackModel || null);
    const next = JSON.stringify(profile.fallbackModel || null);
    if (cur !== next) {
      modelChanges.push({
        key: "fallbackModel",
        newValue: profile.fallbackModel ? profile.fallbackModel.join(", ") : "(삭제)",
        oldValue: current.fallbackModel ? current.fallbackModel.join(", ") : "(없음)",
      });
    }
  }

  const isEmpty =
    added.length === 0 &&
    removed.length === 0 &&
    changed.length === 0 &&
    modelChanges.length === 0;

  return React.createElement(Box, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "yellow",
    paddingX: 1,
    flexGrow: 1,
  },
    React.createElement(Box, { marginBottom: 1 },
      theme.warning.bold("⚡ Diff Preview"),
      React.createElement(Text, { color: "gray" },
        " (apply 시 settings.json 변경 사항)")
    ),

    isEmpty
      ? React.createElement(Box, { paddingY: 1 },
          React.createElement(Text, { color: "green" }, "  변경 사항 없음"))
      : null,

    added.map((it, i) =>
      React.createElement(Box, { key: "a" + i },
        React.createElement(Text, { color: "green" }, "  + "),
        React.createElement(Text, { color: "green" }, it.key),
        " = ",
        React.createElement(Text, { color: "green" },
          isSensitive(it.key) ? mask(it.value) : it.value)
      )
    ),

    removed.map((it, i) =>
      React.createElement(Box, { key: "r" + i },
        React.createElement(Text, { color: "red" }, "  - "),
        React.createElement(Text, { color: "red" }, it.key),
        " = ",
        React.createElement(Text, { color: "red" },
          isSensitive(it.key) ? mask(it.value) : it.value)
      )
    ),

    changed.map((it, i) =>
      React.createElement(Box, { key: "c" + i, flexDirection: "column" },
        React.createElement(Box, null,
          React.createElement(Text, { color: "yellow" }, "  ~ "),
          React.createElement(Text, { color: "yellow" }, it.key)
        ),
        React.createElement(Box, { paddingLeft: 5 },
          React.createElement(Text, { color: "red" }, "- "),
          React.createElement(Text, { color: "red" },
            isSensitive(it.key) ? mask(it.oldValue) : it.oldValue)
        ),
        React.createElement(Box, { paddingLeft: 5 },
          React.createElement(Text, { color: "green" }, "+ "),
          React.createElement(Text, { color: "green" },
            isSensitive(it.key) ? mask(it.value) : it.value)
        )
      )
    ),

    modelChanges.map((it, i) =>
      React.createElement(Box, { key: "m" + i, flexDirection: "column" },
        React.createElement(Box, null,
          React.createElement(Text, { color: "yellow" }, "  ~ "),
          React.createElement(Text, { color: "yellow" }, it.key)
        ),
        React.createElement(Box, { paddingLeft: 5 },
          React.createElement(Text, { color: "red" }, "- "),
          React.createElement(Text, { color: "red" }, it.oldValue)
        ),
        React.createElement(Box, { paddingLeft: 5 },
          React.createElement(Text, { color: "green" }, "+ "),
          React.createElement(Text, { color: "green" }, it.newValue)
        )
      )
    ),

    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: "gray" },
        "  [Enter] 적용   [Esc] 취소")
    )
  );
}

module.exports = DiffView;