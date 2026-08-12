"use strict";
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import ProfileDetail from "./ProfileDetail.mjs";
import DiffView from "./DiffView.mjs";
import { FormStep } from "./ProfileForm.mjs";
import ScrollBox from "./ScrollBox.mjs";
import { colors, mask } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const manager = require("../manager.cjs");

const e = React.createElement;

const HEIGHT_OFFSET = 6; // StatusBar(3) + Footer(3)

export default function MainPanel({
  view,
  profile,
  currentSettings,
  formState,
  scroll,
  focus,
  pendingDelete,
  renameTarget,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  settingsContent,
  pathValue,
  onPathChange,
  onPathSubmit,
  activeProfileName,
}) {
  // 포커스 시 borderColor: cyan, 비포커스 시 gray
  const activeBorder = focus ? "cyan" : "gray";
  const { t } = useI18n();

  const mainContent = (() => {
    // 경로 변경 프롬프트
    if (view === "path-prompt") {
      return e(
        Box,
        {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: activeBorder,
          paddingX: 2,
          paddingY: 2,
          flexGrow: 1,
        },
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.primary, bold: true }, t("pathTitle"))
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, t("currentPath") + " "),
          e(Text, { color: colors.info }, manager.getSettingsPath())
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, t("newPath") + " ")
        ),
        e(TextInput, {
          value: pathValue,
          onChange: onPathChange,
          onSubmit: onPathSubmit,
          placeholder: manager.getSettingsPath(),
        }),
        e(
          Box,
          { marginTop: 1 },
          e(
            Text,
            { color: colors.muted },
            t("pathConfirm")
          )
        )
      );
    }

    // 이름 변경 프롬프트
    if (view === "rename-prompt") {
      return e(
        Box,
        {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: activeBorder,
          paddingX: 2,
          paddingY: 2,
          flexGrow: 1,
        },
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.primary, bold: true }, t("renameTitle"))
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, t("newName") + " ")
        ),
        e(TextInput, {
          value: renameValue,
          onChange: onRenameChange,
          onSubmit: onRenameSubmit,
          placeholder: renameTarget || t("newName"),
        }),
        e(
          Box,
          { marginTop: 1 },
          e(
            Text,
            { color: colors.muted },
            t("renameConfirm")
          )
        )
      );
    }

    // 설정 파일 보기
    if (view === "settings-view") {
      const settings = settingsContent;
      const env = (settings && settings.env) || {};
      const keys = Object.keys(env);
      return e(
        Box,
        {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: activeBorder,
          paddingX: 2,
          paddingY: 1,
          flexGrow: 1,
        },
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.primary, bold: true }, t("settingsTitle")),
          e(Text, { color: colors.muted }, "  (" + (settings ? t("exists") : t("notFound")) + ")")
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, t("path") + " "),
          e(Text, { color: colors.info }, manager.getSettingsPath())
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.muted }, t("changePath"))
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.brand, bold: true }, "─ env ─")
        ),
        keys.length === 0
          ? e(Text, { color: colors.muted }, "  " + t("noEnv"))
          : keys.map((k, i) =>
              e(
                Box,
                { key: i },
                e(Text, { color: "cyan" }, k.padEnd(35, " ")),
                e(Text, null, " = "),
                /KEY|SECRET|TOKEN/.test(k)
                  ? e(Text, { color: colors.muted }, mask(env[k]))
                  : e(Text, { color: colors.primary }, env[k])
              )
            ),
        settings && settings.model
          ? e(Box, { marginTop: 1 }, e(Text, { color: colors.warning }, "model: "), e(Text, null, settings.model))
          : null,
        settings && settings.fallbackModel
          ? e(Box, null, e(Text, { color: colors.warning }, "fallbackModel: "), e(Text, null, Array.isArray(settings.fallbackModel) ? settings.fallbackModel.join(", ") : settings.fallbackModel))
          : null,
        e(
          Box,
          { marginTop: 1 },
          e(Text, { color: colors.muted }, t("close"))
        )
      );
    }

    // 삭제 확인 다이얼로그
    if (pendingDelete) {
      return e(
        Box,
        {
          flexDirection: "column",
          borderStyle: "round",
          borderColor: "red",
          paddingX: 2,
          paddingY: 2,
          flexGrow: 1,
          justifyContent: "center",
        },
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: colors.danger, bold: true }, "⚠ " + t("deleteTitle"))
        ),
        e(
          Box,
          { marginBottom: 2 },
          e(Text, { color: colors.muted }, t("deleteConfirm", { name: pendingDelete }))
        ),
        e(
          Box,
          null,
          e(Text, { color: colors.danger, bold: true }, " [y] "),
          e(Text, { color: colors.muted }, t("yesDelete") + "   "),
          e(Text, { color: colors.muted }, "[n] "),
          e(Text, { color: colors.muted }, t("noCancel"))
        )
      );
    }

    switch (view) {
      case "detail":
        return e(ProfileDetail, {
          profile,
          borderColor: activeBorder,
          isActive: !!profile && profile.name === activeProfileName,
        });

      case "diff":
        return e(DiffView, { profile, current: currentSettings, borderColor: activeBorder });

      case "form":
        return e(FormStep, formState);

      case "empty":
      default:
        return e(
          Box,
          {
            flexDirection: "column",
            borderStyle: "round",
            borderColor: activeBorder,
            paddingX: 2,
            paddingY: 2,
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          },
          e(
            Box,
            { marginBottom: 2 },
            e(Text, { color: colors.cyan }, "✦"),
            e(Text, null, " "),
            e(Text, { color: colors.cyan, bold: true }, "Claude API Manager")
          ),
          e(
            Box,
            { flexDirection: "column", alignItems: "center" },
            e(Text, { color: colors.muted }, "  ← " + t("selectLeft")),
            e(Text, null, " "),
            e(Text, { color: colors.muted }, "  " + t("addNewProfile")),
            e(Text, { color: colors.muted }, "  " + t("captureSettings")),
            e(Text, { color: colors.muted }, "  " + t("help"))
          )
        );
    }
  })();

  // form, empty는 스크롤 불필요
  if (view === "empty" || view === "form") {
    return e(
      Box,
      { flexGrow: 1, flexDirection: "column", paddingX: 1 },
      mainContent
    );
  }

  return e(
    Box,
    { flexGrow: 1, flexDirection: "column", paddingX: 1 },
    e(ScrollBox, { scroll, heightOffset: HEIGHT_OFFSET }, mainContent)
  );
}