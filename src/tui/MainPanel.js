"use strict";
const React = require("react");
const { Box, Text } = require("ink");
const ProfileDetail = require("./ProfileDetail");
const DiffView = require("./DiffView");
const { FormStep } = require("./ProfileForm");
const { theme } = require("./theme");

function MainPanel({ view, profile, currentSettings, formState, setFormState, onApply, onCancelApply }) {
  switch (view) {
    case "detail":
      return React.createElement(ProfileDetail, {
        profile: profile,
        isActive: profile && currentSettings &&
          currentSettings.env &&
          profile.env &&
          JSON.stringify(profile.env) === JSON.stringify(currentSettings.env),
      });

    case "diff":
      return React.createElement(DiffView, {
        profile: profile,
        current: currentSettings,
      });

    case "form":
      return React.createElement(FormStep, formState);

    case "empty":
    default:
      return React.createElement(Box, {
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "gray",
        paddingX: 2,
        paddingY: 2,
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
      },
        React.createElement(Box, { marginBottom: 2 },
          React.createElement(Text, { color: "cyan" }, "✦"),
          " ",
          React.createElement(Text, { color: "cyan", bold: true }, "Claude API Manager")
        ),
        React.createElement(Box, { flexDirection: "column", alignItems: "center" },
          React.createElement(Text, { color: "gray" }, "  ← 좌측에서 프로필 선택"),
          React.createElement(Text, null, " "),
          React.createElement(Text, { color: "gray" }, "  [n] 새 프로필 추가"),
          React.createElement(Text, { color: "gray" }, "  [c] settings.json → 프로필"),
          React.createElement(Text, { color: "gray" }, "  [?] 도움말")
        )
      );
  }
}

module.exports = MainPanel;