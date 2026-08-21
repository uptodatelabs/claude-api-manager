"use strict";
import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../../package.json");

const e = React.createElement;

// 토큰 수를 읽기 좋게 포맷 (12345 → 12.3k)
function formatTokens(n) {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export default function StatusBar({ activeProfile, view, mode, message, lang, proxyRunning, proxyProfile, proxyPort, proxyFilter, proxyUsage, proxyRateLimit, proxyDebug, proxyError }) {
  const { t } = useI18n();

  // 1번째 줄: 앱 정보 + 언어
  const line1 = [
    e(Text, { color: colors.brand, bold: true }, "✦ Claude API Manager"),
    e(Text, { color: colors.muted }, " v" + pkg.version),
    e(Text, { color: colors.muted }, " │ "),
    e(Text, { color: colors.muted }, "uptodatelabs"),
    e(Text, { color: colors.muted }, " │ "),
    e(Text, { color: colors.warning }, lang === "en" ? "EN" : "KO"),
  ];

  if (mode) {
    line1.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.warning }, mode)
    );
  }

  // 2번째 줄: 프로필/프록시 상태 + 토큰 사용량
  const line2 = [
    activeProfile
      ? e(
          Text,
          null,
          e(Text, { color: colors.muted }, `${t("active")}: `),
          e(Text, { color: colors.success }, activeProfile)
        )
      : e(Text, { color: colors.muted }, `${t("active")}: -`),
    e(Text, { color: colors.muted }, " │ "),
    e(
      Text,
      null,
      e(Text, { color: colors.muted }, `${t("view")}: `),
      e(Text, { color: colors.primary }, view)
    ),
  ];

  if (proxyRunning) {
    line2.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.success }, `* ${proxyProfile}:${proxyPort}`)
    );
    if (proxyDebug) {
      line2.push(
        e(Text, { color: colors.muted }, " │ "),
        e(Text, { color: colors.warning }, `[D] ${t("debugOn")}`)
      );
    }
    if (proxyUsage) {
      line2.push(
        e(Text, { color: colors.muted }, " │ "),
        e(Text, { color: colors.info }, `${t("usage")} `),
        e(Text, { color: colors.info }, `in ${formatTokens(proxyUsage.inputTokens)}`),
        e(Text, { color: colors.muted }, " / "),
        e(Text, { color: colors.info }, `out ${formatTokens(proxyUsage.outputTokens)}`),
        e(Text, { color: colors.muted }, " / "),
        e(Text, { color: colors.info }, `req ${proxyUsage.requests}`)
      );
    }
    if (proxyRunning && proxyRateLimit) {
      const rl = proxyRateLimit;
      let rlText;
      let rlColor = colors.muted;
      if (rl.mode === "off") {
        rlText = "RL off";
      } else if (rl.mode === "static") {
        rlText = `RL ${rl.limit}/min`;
        rlColor = colors.info;
      } else {
        // auto
        const eff = rl.limit === null ? "∞" : `${rl.limit}/min`;
        rlText = `RL auto ${eff} (${rl.window} in 60s)`;
        rlColor = rl.limit !== null && rl.window >= rl.limit ? colors.warning : colors.info;
      }
      line2.push(
        e(Text, { color: colors.muted }, " │ "),
        e(Text, { color: rlColor }, rlText)
      );
    }
  }

  if (proxyFilter) {
    line2.push(
      e(Text, { color: colors.muted }, " │ "),
      e(Text, { color: colors.warning }, "Proxy")
    );
  }

  if (message) {
    if (line2.length > 0) line2.push(e(Text, { color: colors.muted }, " │ "));
    const msgColor = message.type === "success"
      ? colors.success
      : message.type === "danger"
      ? colors.danger
      : colors.info;
    line2.push(e(Text, { color: msgColor }, message.text));
  } else if (proxyError) {
    if (line2.length > 0) line2.push(e(Text, { color: colors.muted }, " │ "));
    line2.push(e(Text, { color: colors.danger, bold: true }, proxyError.message || ""));
    if (proxyError.pids && proxyError.pids.length > 0) {
      line2.push(e(Text, { color: colors.muted }, " "));
      line2.push(e(Text, { color: colors.warning }, `[K] ${t("portKill")}`));
    }
  }

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "cyan",
      paddingX: 1,
      flexShrink: 0,
    },
    e(Text, { wrap: "truncate-end" }, ...line1),
    e(Text, { wrap: "truncate-end" }, ...line2)
  );
}
