"use strict";
import React from "react";
import { Box, Text } from "ink";
import ProfileDetail from "./ProfileDetail.mjs";
import DiffView from "./DiffView.mjs";
import { FormStep } from "./ProfileForm.mjs";
import { theme } from "./theme.mjs";

const e = React.createElement;

export default function MainPanel({ view, profile, currentSettings, formState }) {
  switch (view) {
    case "detail":
      return e(ProfileDetail, {
        profile,
        isActive:
          profile &&
          currentSettings &&
          currentSettings.env &&
          profile.env &&
          JSON.stringify(profile.env) === JSON.stringify(currentSettings.env),
      });

    case "diff":
      return e(DiffView, { profile, current: currentSettings });

    case "form":
      return e(FormStep, formState);

    case "empty":
    default:
      return e(
        Box,
        {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: "gray",
          paddingX: 2,
          paddingY: 2,
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        e(
          Box,
          { marginBottom: 2 },
          e(Text, { color: "cyan" }, "✦"),
          e(Text, null, " "),
          e(Text, { color: "cyan", bold: true }, "Claude API Manager")
        ),
        e(
          Box,
          { flexDirection: "column", alignItems: "center" },
          e(Text, { color: "gray" }, "  ← 좌측에서 프로필 선택"),
          e(Text, null, " "),
          e(Text, { color: "gray" }, "  [n] 새 프로필 추가"),
          e(Text, { color: "gray" }, "  [c] settings.json → 프로필"),
          e(Text, { color: "gray" }, "  [?] 도움말")
        )
      );
  }
}