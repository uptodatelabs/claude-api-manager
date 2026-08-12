"use strict";
import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const manager = require("../manager.cjs");
const { ProxyServer } = require("../proxy/server.cjs");

import StatusBar from "./StatusBar.mjs";
import Footer from "./Footer.mjs";
import Sidebar from "./Sidebar.mjs";
import MainPanel from "./MainPanel.mjs";
import { theme, detectProvider } from "./theme.mjs";
import { KNOWN_ENV_KEYS } from "./ProfileForm.mjs";
import { I18nContext, translate } from "./i18n.mjs";

const STEPS = ["provider", "keys", "meta", "custom"];

const e = React.createElement;

export default function App() {
  const { exit } = useApp();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [view, setView] = useState("empty");
  const [currentSettings, setCurrentSettings] = useState(null);
  const [message, setMessage] = useState(null);
  const [formStepIdx, setFormStepIdx] = useState(0);
  const [formData, setFormData] = useState({ provider: "anthropic" });
  const [editingProfile, setEditingProfile] = useState(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [sidebarManualScroll, setSidebarManualScroll] = useState(0);
  const [focus, setFocus] = useState("sidebar");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [settingsContent, setSettingsContent] = useState(null);
  const [pathValue, setPathValue] = useState("");
  const [proxyProfile, setProxyProfile] = useState(null);
  const [proxyPort, setProxyPort] = useState(3456);
  const [proxyRunning, setProxyRunning] = useState(false);
  const [proxyError, setProxyError] = useState(null);
  const proxyRef = useRef(null);
  const [proxyFilter, setProxyFilter] = useState(false);
  const [lang, setLang] = useState("en");

  // i18n: t(key, params)
  const t = (key, params) => translate(lang, key, params);
  const i18nValue = {
    lang,
    setLang,
    t,
  };

  // 프록시 서버 관리
  const startProxy = async (profileName, port = 3456) => {
    const profile = manager.getProfile(profileName);
    if (!profile) {
      setProxyError(t("profileNotFound", { name: profileName }));
      return;
    }

    const env = profile.env || {};
    const baseUrl = env.ANTHROPIC_BASE_URL || env.OPENAI_BASE_URL || "";
    const apiKey = env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.OPENAI_API_KEY || "";
    const model = env.ANTHROPIC_MODEL || "";

    if (!baseUrl) {
      setProxyError(t("proxyNoBaseUrl"));
      return;
    }

    try {
      const server = new ProxyServer({
        port,
        targetUrl: baseUrl,
        apiKey,
        model,
        profileName,
        manager,
      });

      await server.start();
      proxyRef.current = server;
      setProxyProfile(profileName);
      setProxyPort(port);
      setProxyRunning(true);
      setProxyError(null);
      flash(t("proxyStarted", { port, target: baseUrl }), "success");
    } catch (err) {
      setProxyError(err.message);
    }
  };

  const stopProxy = async () => {
    if (proxyRef.current) {
      await proxyRef.current.stop();
      proxyRef.current = null;
    }
    setProxyProfile(null);
    setProxyRunning(false);
    setProxyError(null);
    flash(t("proxyStopped"), "success");
  };

  // useRef로 최신 상태를 항상 참조 (useInput 클로저 stale 문제 해결)
  const stateRef = useRef({});
  const filtered =
    searchValue
      ? profiles.filter(
          (p) =>
            p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            (p.description &&
              p.description.toLowerCase().includes(searchValue.toLowerCase())) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchValue.toLowerCase())))
        )
      : profiles;

  // 프록시 필터 적용 (proxy 태그가 있는 프로필만)
  const filteredProfiles = proxyFilter
    ? filtered.filter((p) => p.tags && p.tags.includes("proxy"))
    : filtered;

  stateRef.current = {
    profiles,
    selectedIndex,
    searchMode,
    searchValue,
    view,
    focus,
    pendingDelete,
    renameTarget,
    filtered: filteredProfiles,
    activeProfileName: activeProfile,
  };

  const reload = () => {
    const list = manager.listProfiles();
    setProfiles(list);
    setActiveProfile(manager.getActiveProfileName());
    setCurrentSettings(manager.readSettings());
    if (stateRef.current.selectedIndex >= list.length) {
      setSelectedIndex(Math.max(0, list.length - 1));
    }
    if (list.length > 0 && stateRef.current.view === "empty") {
      setView("detail");
    }
  };

  useEffect(() => {
    // 이전 실행에서 프록시가 급작 종료되어 남은 설정 백업이 있으면 복원
    if (ProxyServer.restoreFromDisk(manager)) {
      flash(t("proxyRestored"), "info");
    }
    reload();
  }, []);

  const flash = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const selectedProfile = filtered[selectedIndex] || profiles[selectedIndex];

  // 단일 useInput — 모든 키 입력 처리
  useInput((input, key) => {
    const s = stateRef.current;

    // 검색 모드
    if (s.searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setSearchValue("");
      }
      return;
    }

    // diff 뷰에서 Enter
    if (s.view === "diff") {
      if (key.return || input === "y") {
        const prof = s.filtered[s.selectedIndex] || s.profiles[s.selectedIndex];
        if (!prof) return;
        try {
          manager.applyProfile(prof.name);
          flash(t("successApplied", { name: prof.name }), "success");
          // proxy 태그가 있는 프로필이면 프록시 자동 시작
          if (prof.tags && prof.tags.includes("proxy")) {
            if (!proxyRunning || proxyProfile !== prof.name) {
              if (proxyRunning) {
                stopProxy().then(() => startProxy(prof.name, proxyPort));
              } else {
                startProxy(prof.name, proxyPort);
              }
            }
          }
          reload();
          setView("detail");
        } catch (err) {
          flash(t("errorMsg", { msg: err.message }), "danger");
          setView("detail");
        }
      } else if (key.escape || input === "n") {
        setView("detail");
      }
      return;
    }

    // 삭제 확인 중
    if (s.pendingDelete) {
      if (input === "y" || key.return) {
        try {
          manager.removeProfile(s.pendingDelete);
          flash(t("successDeleted", { name: s.pendingDelete }), "success");
          reload();
        } catch (err) {
          flash(t("errorMsg", { msg: err.message }), "danger");
        }
        setPendingDelete(null);
      } else if (input === "n" || key.escape) {
        setPendingDelete(null);
      }
      return;
    }

    // 이름 변경 프롬프트
    if (s.view === "rename-prompt") {
      if (key.escape) {
        setRenameTarget(null);
        setRenameValue("");
        setView("detail");
      }
      return;
    }

    // 설정 파일 보기
    if (s.view === "settings-view") {
      if (key.escape || input === "q" || input === "s") {
        setView("detail");
      } else if (input === "p") {
        setPathValue(manager.getSettingsPath());
        setView("path-prompt");
      }
      return;
    }

    // 경로 변경 프롬프트
    if (s.view === "path-prompt") {
      if (key.escape) {
        setView("settings-view");
      }
      return;
    }

    // 폼/프롬프트 뷰에서는 입력 무시
    if (
      s.view === "form" ||
      s.view === "capture-prompt" ||
      s.view === "import-prompt" ||
      s.view === "export-prompt"
    ) {
      return;
    }

    // 종료 (프록시 정리 후 종료)
    if (input === "q" || (key.ctrl && input === "c")) {
      if (proxyRef.current) {
        stopProxy().then(() => exit());
      } else {
        exit();
      }
      return;
    }

    // Tab으로 포커스 전환
    if (key.tab) {
      setFocus(s.focus === "sidebar" ? "main" : "sidebar");
      return;
    }

    // 사이드바 포커스
    if (s.focus === "sidebar") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        setView("detail");
        setScrollOffset(0);
        return;
      }
      if (key.downArrow) {
        const max = Math.max(0, s.filtered.length - 1);
        setSelectedIndex((i) => Math.min(max, i + 1));
        setView("detail");
        setScrollOffset(0);
        return;
      }
      if (input === "k") {
        setSidebarManualScroll((s2) => Math.max(0, s2 - 1));
        return;
      }
      if (input === "j") {
        setSidebarManualScroll((s2) => s2 + 1);
        return;
      }
      if (key.pageUp) {
        setSidebarManualScroll((s2) => Math.max(0, s2 - 5));
        return;
      }
      if (key.pageDown) {
        setSidebarManualScroll((s2) => s2 + 5);
        return;
      }
      if (input === "g") {
        setSidebarManualScroll(0);
        return;
      }
      if (input === "G") {
        setSidebarManualScroll(999);
        return;
      }
    }

    // 메인 포커스
    if (s.focus === "main") {
      if (key.upArrow || input === "k") {
        setScrollOffset((s2) => Math.max(0, s2 - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setScrollOffset((s2) => s2 + 1);
        return;
      }
      if (key.pageUp) {
        setScrollOffset((s2) => Math.max(0, s2 - 5));
        return;
      }
      if (key.pageDown) {
        setScrollOffset((s2) => s2 + 5);
        return;
      }
      if (input === "g") {
        setScrollOffset(0);
        return;
      }
      if (input === "G") {
        setScrollOffset(999);
        return;
      }
    }

    // 공통 명령어 (포커스 무관)
    if (input === "/") {
      setSearchMode(true);
      setView("detail");
      return;
    }
    if (input === "f") {
      setProxyFilter(!proxyFilter);
      setSelectedIndex(0);
      return;
    }
    if (key.return && selectedProfile) {
      setView("diff");
      setScrollOffset(0);
      return;
    }
    if (input === "a" && selectedProfile) {
      setView("diff");
      setScrollOffset(0);
      return;
    }
    if (input === "e" && selectedProfile) {
      const p = selectedProfile;
      const env = p.env || {};
      // 표준 키는 그대로, 나머지는 customList로 분리
      const customList = Object.entries(env)
        .filter(([k]) => !KNOWN_ENV_KEYS.includes(k))
        .map(([k, v]) => ({ key: k, value: v }));
      const standardEnv = {};
      for (const [k, v] of Object.entries(env)) {
        if (KNOWN_ENV_KEYS.includes(k)) standardEnv[k] = v;
      }
      setEditingProfile(p);
      setFormStepIdx(0);
      setFormData({
        provider: detectProvider(env),
        ...standardEnv,
        model: p.model || "",
        fallbackModel: p.fallbackModel ? p.fallbackModel.join(", ") : "",
        description: p.description || "",
        tags: p.tags ? p.tags.join(", ") : "",
        customList,
      });
      setView("form");
      return;
    }
    if (input === "d" && selectedProfile) {
      setPendingDelete(selectedProfile.name);
      return;
    }
    if (input === "r" && selectedProfile) {
      setRenameTarget(selectedProfile.name);
      setRenameValue(selectedProfile.name);
      setView("rename-prompt");
      return;
    }
    if (input === "s") {
      setSettingsContent(manager.readSettings());
      setView("settings-view");
      return;
    }
    if (input === "l") {
      setLang(lang === "en" ? "ko" : "en");
      return;
    }
    // p: 활성 프로필 기준으로 프록시 실행/중지
    if (input === "p" && s.activeProfileName) {
      if (proxyRunning && proxyProfile === s.activeProfileName) {
        stopProxy();
      } else if (!proxyRunning) {
        startProxy(s.activeProfileName, proxyPort);
      } else {
        // 다른 프로필로 프록시 재시작
        stopProxy().then(() => startProxy(s.activeProfileName, proxyPort));
      }
      return;
    }
    if (input === "n") {
      setEditingProfile(null);
      setFormStepIdx(0);
      setFormData({ provider: "anthropic" });
      setView("form");
      return;
    }
    if (input === "c") {
      setView("capture-prompt");
      return;
    }
    if (input === "i") {
      setView("import-prompt");
      return;
    }
    if (input === "x") {
      setView("export-prompt");
      return;
    }
    if (key.escape) {
      setView("detail");
      setScrollOffset(0);
      return;
    }
  });

  const isEdit = !!editingProfile;
  const formStepName = (() => {
    const steps = formData.provider === "proxy"
      ? ["provider", "proxy_template", "proxy_keys", "meta", "custom"]
      : STEPS;
    return steps[formStepIdx];
  })();

  const goFormNext = () => {
    if (formStepIdx === STEPS.length - 1) {
      try {
        const env = {};
        for (const [k, v] of Object.entries(formData)) {
          if (["provider", "model", "fallbackModel", "description", "tags", "customList"].includes(k)) continue;
          if (typeof v !== "string") continue;
          const trimmed = v.trim();
          if (!trimmed || trimmed === "-") continue;
          env[k] = trimmed;
        }
        // 커스텀 env 병합
        const customList = formData.customList || [];
        for (const c of customList) {
          if (c.key && c.value) env[c.key] = c.value;
        }
        if (formData.provider === "bedrock") env.CLAUDE_CODE_USE_BEDROCK = "1";
        if (formData.provider === "vertex") env.CLAUDE_CODE_USE_VERTEX = "1";
        if (formData.provider === "foundry") env.CLAUDE_CODE_USE_FOUNDRY = "1";

        // settings.json top-level model 키 (env.ANTHROPIC_MODEL과 별개)
        const model =
          formData.model && formData.model.trim() !== "-"
            ? formData.model.trim()
            : null;
        const fallback = formData.fallbackModel
          ? formData.fallbackModel.split(",").map((s) => s.trim()).filter(Boolean)
          : null;
        const description =
          formData.description && formData.description.trim() !== "-"
            ? formData.description.trim()
            : null;
        // tags: '-' 입력 시 전체 삭제, 비어있으면 삭제
        let tags = null;
        if (formData.tags && formData.tags.trim() && formData.tags.trim() !== "-") {
          tags = formData.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        if (isEdit) {
          manager.updateProfile(
            editingProfile.name,
            env,
            model,
            fallback,
            description,
            tags
          );
          flash(t("successUpdated", { name: editingProfile.name }), "success");
        } else {
          const name = `profile-${Date.now()}`;
          manager.addProfile(name, env, model, fallback, description, tags);
          flash(t("successAdded", { name }), "success");
        }
        reload();
        setView("detail");
        setFormStepIdx(0);
        setFormData({ provider: "anthropic" });
        setEditingProfile(null);
      } catch (err) {
        flash(t("errorMsg", { msg: err.message }), "danger");
      }
    } else {
      setFormStepIdx(formStepIdx + 1);
    }
  };

  const goFormPrev = () => {
    if (formStepIdx === 0) {
      setView("detail");
      setEditingProfile(null);
    } else {
      setFormStepIdx(formStepIdx - 1);
    }
  };

  const cancelForm = () => {
    setView("detail");
    setEditingProfile(null);
    setFormStepIdx(0);
    setFormData({ provider: "anthropic" });
  };

  const formState = {
    step: formStepName,
    formData,
    setFormData,
    onNext: goFormNext,
    onPrev: goFormPrev,
    onCancel: cancelForm,
    isEdit,
  };

  return e(
    I18nContext.Provider,
    { value: i18nValue },
    e(
      Box,
      { flexDirection: "column", width: "100%", height: "100%" },
      e(StatusBar, {
        activeProfile,
        view,
        lang,
        mode: searchMode ? t("searching") : null,
        message,
        proxyRunning,
        proxyProfile,
        proxyPort,
        proxyFilter,
      }),
      e(
        Box,
        { flexGrow: 1, flexDirection: "row" },
        e(Sidebar, {
          profiles: filteredProfiles,
          activeProfile,
          selectedIndex,
          searchMode,
          searchValue,
          manualScroll: sidebarManualScroll,
          isFocused: focus === "sidebar",
          proxyRunning,
          proxyProfile,
          onSearchChange: (v) => {
            setSearchValue(v);
            setSelectedIndex(0);
            setSidebarManualScroll(0);
          },
          onSearchExit: () => {
            setSearchMode(false);
            setSearchValue("");
          },
        }),
        e(
          Box,
          { flexGrow: 1, flexDirection: "column", paddingX: 1 },
          e(MainPanel, {
            view,
            profile: selectedProfile,
            currentSettings,
            formState,
            scroll: scrollOffset,
            focus: focus === "main",
            pendingDelete,
            renameTarget,
            renameValue,
            settingsContent,
            activeProfileName: activeProfile,
            onRenameChange: (v) => setRenameValue(v),
            onRenameSubmit: () => {
              const newName = renameValue.trim();
              if (!newName || !renameTarget || newName === renameTarget) {
                setRenameTarget(null);
                setRenameValue("");
                setView("detail");
                return;
              }
              try {
                manager.renameProfile(renameTarget, newName);
                flash(t("successRenamed", { old: renameTarget, new: newName }), "success");
                reload();
              } catch (err) {
                flash(t("errorMsg", { msg: err.message }), "danger");
              }
              setRenameTarget(null);
              setRenameValue("");
              setView("detail");
            },
            pathValue,
            onPathChange: (v) => setPathValue(v),
            onPathSubmit: () => {
              const newPath = pathValue.trim();
              if (!newPath) {
                setView("settings-view");
                return;
              }
              try {
                manager.setSettingsPath(newPath);
                flash(t("successPath", { path: newPath }), "success");
                setSettingsContent(manager.readSettings());
              } catch (err) {
                flash(t("errorMsg", { msg: err.message }), "danger");
              }
              setView("settings-view");
            },
          })
        )
      ),
      e(Footer)
    )
  );
}