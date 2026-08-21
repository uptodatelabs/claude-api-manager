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
const pkg = require("../../package.json");

const e = React.createElement;

const HEIGHT_OFFSET = 7; // StatusBar(4) + Footer(3)

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
  exportPath,
  onExportChange,
  onExportSubmit,
  importPath,
  onImportChange,
  onImportSubmit,
  captureName,
  onCaptureChange,
  onCaptureSubmit,
  activeProfileName,
  settingsEditIndex,
  settingsEditKey,
  settingsEditValue,
  settingsEditMode,
  settingsEditStep,
  onSettingsEditKeyChange,
  onSettingsEditValueChange,
  onSettingsEditSubmit,
  proxyDebug,
  proxyDebugLogs,
  debugScroll,
  proxyRateLimit,
}) {
    // 포커스 시 borderColor: cyan, 비포커스 시 gray
  const activeBorder = focus ? "cyan" : "gray";
  const { t } = useI18n();

  // export / import / capture 프롬프트 — path-prompt와 동일한 레이아웃
  if (view === "export-prompt") {
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
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.primary, bold: true }, t("export"))),
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.muted }, t("export") + " file path")),
      e(TextInput, { value: exportPath, onChange: onExportChange, onSubmit: onExportSubmit, placeholder: "./claude-api-manager-export.json" }),
      e(Box, { marginTop: 1 }, e(Text, { color: colors.muted }, t("saveConfirm") + "  [esc] " + t("back")))
    );
  }
  if (view === "import-prompt") {
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
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.primary, bold: true }, t("import"))),
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.muted }, t("import") + " file path")),
      e(TextInput, { value: importPath, onChange: onImportChange, onSubmit: onImportSubmit, placeholder: "./claude-api-manager-export.json" }),
      e(Box, { marginTop: 1 }, e(Text, { color: colors.muted }, t("saveConfirm") + "  [esc] " + t("back")))
    );
  }
  if (view === "capture-prompt") {
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
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.primary, bold: true }, t("capture"))),
      e(Box, { marginBottom: 1 }, e(Text, { color: colors.muted }, "profile name")),
      e(TextInput, { value: captureName, onChange: onCaptureChange, onSubmit: onCaptureSubmit, placeholder: "my-profile" }),
      e(Box, { marginTop: 1 }, e(Text, { color: colors.muted }, t("saveConfirm") + "  [esc] " + t("back")))
    );
  }

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
          e(Text, { color: colors.muted }, t("close")),
          e(Text, { color: colors.warning }, "   [e] "),
          e(Text, { color: colors.muted }, t("editEnv"))
        )
      );
    }

    // 설정 env 편집 (키 선택)
    if (view === "settings-edit") {
      const settings = settingsContent;
      const env = (settings && settings.env) || {};
      const keys = Object.keys(env);
      const cur = Number.isFinite(settingsEditIndex) ? settingsEditIndex : 0;
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
          e(Text, { color: colors.primary, bold: true }, t("editEnvTitle"))
        ),
        keys.length === 0
          ? e(Text, { color: colors.muted }, "  " + t("noEnv"))
          : keys.map((k, i) =>
              e(
                Box,
                { key: k },
                e(
                  Text,
                  { color: i === cur ? colors.primary : colors.muted, bold: i === cur },
                  (i === cur ? "▶ " : "  ") + k.padEnd(33, " ")
                ),
                e(Text, null, " = "),
                /KEY|SECRET|TOKEN/.test(k)
                  ? e(Text, { color: colors.muted }, mask(env[k]))
                  : e(Text, { color: i === cur ? "cyan" : colors.primary }, env[k])
              )
            ),
        e(
          Box,
          { marginTop: 1 },
          e(Text, { color: colors.muted }, "↑↓ " + t("move")),
          e(Text, { color: colors.primary }, " [Enter] "),
          e(Text, { color: colors.muted }, t("edit")),
          e(Text, { color: colors.primary }, " [a] "),
          e(Text, { color: colors.muted }, t("add")),
          e(Text, { color: colors.danger }, " [d] "),
          e(Text, { color: colors.muted }, t("delete")),
          e(Text, { color: colors.muted }, "  [esc] "),
          e(Text, { color: colors.muted }, t("back"))
        )
      );
    }

    // 설정 env 값 수정/추가 프롬프트
    if (view === "settings-edit-value") {
      const isAdd = settingsEditMode === "add";
      const keyFocused = isAdd && settingsEditStep === "key";
      const valueFocused = !keyFocused;
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
          e(Text, { color: colors.primary, bold: true }, isAdd ? t("addEnvTitle") : t("editEnvTitle"))
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: keyFocused ? colors.primary : colors.muted, bold: keyFocused }, t("envKey") + " "),
          e(TextInput, {
            value: settingsEditKey,
            onChange: onSettingsEditKeyChange,
            onSubmit: onSettingsEditSubmit,
            placeholder: "KEY",
            focus: keyFocused,
          })
        ),
        e(
          Box,
          { marginBottom: 1 },
          e(Text, { color: valueFocused ? colors.primary : colors.muted, bold: valueFocused }, t("envValue") + " "),
          e(TextInput, {
            value: settingsEditValue,
            onChange: onSettingsEditValueChange,
            onSubmit: onSettingsEditSubmit,
            placeholder: "value",
            focus: valueFocused,
          })
        ),
        e(
          Box,
          { marginTop: 1 },
          e(Text, { color: colors.muted }, t("saveConfirm"))
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
        return e(
          Box,
          { flexDirection: "column", flexGrow: 1 },
          e(ProfileDetail, {
            profile,
            borderColor: activeBorder,
            isActive: !!profile && profile.name === activeProfileName,
          }),
          proxyDebug
            ? e(
                Box,
                {
                  flexDirection: "column",
                  borderStyle: "round",
                  borderColor: colors.warning,
                  marginTop: 1,
                  paddingX: 1,
                  paddingY: 1,
                  height: 12,
                  flexShrink: 0,
                  overflowY: "hidden",
                },
                e(
                  Box,
                  { marginBottom: 1, flexShrink: 0 },
                  e(Text, { color: colors.warning, bold: true }, "[D] " + t("debugTitle")),
                  e(Text, { color: colors.muted }, "  (" + t("debugFile") + ": ~/.claude-api-manager/proxy-debug.log)"),
                  (() => {
                    if (!proxyRateLimit) return null;
                    const rl = proxyRateLimit;
                    let rlLabel;
                    if (rl.mode === "off") rlLabel = "RL off";
                    else if (rl.mode === "static") rlLabel = `RL ${rl.limit}/min`;
                    else {
                      const eff = rl.limit === null ? "∞" : `${rl.limit}/min`;
                      rlLabel = `RL auto ${eff}`;
                    }
                    return e(
                      Box,
                      { marginLeft: 2, flexShrink: 0 },
                      e(Text, { color: colors.info }, ` │ ${rlLabel}`),
                      e(Text, { color: colors.muted }, ` (${rl.window} in 60s)`)
                    );
                  })(),
                  e(Text, { color: colors.muted }, "  [PgUp/PgDn " + t("scroll") + "]")
                ),
                proxyDebugLogs.length === 0
                  ? e(Text, { color: colors.muted, flexShrink: 0 }, "  " + t("noLogs"))
                  : proxyDebugLogs.slice(-20).slice(debugScroll, debugScroll + 8).map((l, i) =>
                      e(
                        Text,
                        { key: i, wrap: "truncate-end", flexShrink: 0 },
                        e(
                          Text,
                          { color: l.includes("RES ") || l.includes("ERROR") ? colors.danger : colors.primary },
                          l
                        )
                      )
                    )
              )
            : null
        );

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
            { marginBottom: 1 },
            e(Text, { color: colors.cyan }, "✦"),
            e(Text, null, " "),
            e(Text, { color: colors.cyan, bold: true }, "Claude API Manager")
          ),
          e(
            Box,
            { marginBottom: 2 },
            e(Text, { color: colors.muted }, "v" + pkg.version + "  "),
            e(Text, { color: colors.muted }, "uptodatelabs")
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
      { flexGrow: 1, flexDirection: "column", paddingX: 1, overflow: "hidden" },
      mainContent
    );
  }

  return e(
    Box,
    { flexGrow: 1, flexDirection: "column", paddingX: 1, overflow: "hidden" },
    e(ScrollBox, { scroll, heightOffset: HEIGHT_OFFSET }, mainContent)
  );
}