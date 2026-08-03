"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const manager = require("../manager.cjs");

import StatusBar from "./StatusBar.mjs";
import Footer from "./Footer.mjs";
import Sidebar from "./Sidebar.mjs";
import MainPanel from "./MainPanel.mjs";
import { theme, detectProvider } from "./theme.mjs";

const STEPS = ["provider", "keys", "meta"];

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

  const reload = () => {
    const list = manager.listProfiles();
    setProfiles(list);
    setActiveProfile(manager.getActiveProfileName());
    setCurrentSettings(manager.readSettings());
    if (selectedIndex >= list.length) {
      setSelectedIndex(Math.max(0, list.length - 1));
    }
    if (list.length > 0 && view === "empty") {
      setView("detail");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const flash = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const filtered = searchValue
    ? profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (p.description &&
            p.description.toLowerCase().includes(searchValue.toLowerCase())) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchValue.toLowerCase())))
      )
    : profiles;

  const selectedProfile = filtered[selectedIndex] || profiles[selectedIndex];

  useInput((input, key) => {
    if (searchMode) return;
    if (
      view === "form" ||
      view === "capture-prompt" ||
      view === "import-prompt" ||
      view === "export-prompt"
    )
      return;

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      setView("detail");
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
      setView("detail");
    }
    if (input === "/") {
      setSearchMode(true);
      setView("detail");
    }
    if (key.return && selectedProfile) {
      setView("diff");
    }
    if (input === "a" && selectedProfile) {
      setView("diff");
    }
    if (input === "e" && selectedProfile) {
      const p = selectedProfile;
      setEditingProfile(p);
      setFormStepIdx(0);
      setFormData({
        provider: detectProvider(p.env),
        ...p.env,
        fallbackModel: p.fallbackModel ? p.fallbackModel.join(", ") : "",
        description: p.description || "",
        tags: p.tags ? p.tags.join(", ") : "",
      });
      setView("form");
    }
    if (input === "d" && selectedProfile) {
      try {
        manager.removeProfile(selectedProfile.name);
        flash(`✓ "${selectedProfile.name}" 삭제됨`, "success");
        reload();
      } catch (err) {
        flash(`✗ ${err.message}`, "danger");
      }
    }
    if (input === "n") {
      setEditingProfile(null);
      setFormStepIdx(0);
      setFormData({ provider: "anthropic" });
      setView("form");
    }
    if (input === "c") {
      setView("capture-prompt");
    }
    if (input === "i") {
      setView("import-prompt");
    }
    if (input === "x") {
      setView("export-prompt");
    }
    if (key.escape) {
      setView("detail");
    }
  });

  useInput((input, key) => {
    if (!searchMode) return;
    if (key.escape) {
      setSearchMode(false);
      setSearchValue("");
    }
  });

  useInput((input, key) => {
    if (view !== "diff") return;
    if (key.return || input === "y") {
      if (!selectedProfile) return;
      try {
        manager.applyProfile(selectedProfile.name);
        flash(`✓ "${selectedProfile.name}" 적용됨`, "success");
        reload();
        setView("detail");
      } catch (err) {
        flash(`✗ ${err.message}`, "danger");
        setView("detail");
      }
    } else if (key.escape || input === "n") {
      setView("detail");
    }
  });

  const isEdit = !!editingProfile;
  const formStepName = STEPS[formStepIdx];

  const goFormNext = () => {
    if (formStepIdx === STEPS.length - 1) {
      try {
        const env = {};
        for (const [k, v] of Object.entries(formData)) {
          const trimmed = (v || "").trim();
          if (!trimmed || trimmed === "-") continue;
          if (["provider", "fallbackModel", "description", "tags"].includes(k)) continue;
          env[k] = trimmed;
        }
        if (formData.provider === "bedrock") env.CLAUDE_CODE_USE_BEDROCK = "1";
        if (formData.provider === "vertex") env.CLAUDE_CODE_USE_VERTEX = "1";
        if (formData.provider === "foundry") env.CLAUDE_CODE_USE_FOUNDRY = "1";

        const model = formData.ANTHROPIC_MODEL ? formData.ANTHROPIC_MODEL.trim() : null;
        const fallback = formData.fallbackModel
          ? formData.fallbackModel.split(",").map((s) => s.trim()).filter(Boolean)
          : null;
        const description =
          formData.description && formData.description.trim() !== "-"
            ? formData.description.trim()
            : null;
        const tags = formData.tags
          ? formData.tags.split(",").map((s) => s.trim()).filter(Boolean)
          : null;

        if (isEdit) {
          manager.updateProfile(
            editingProfile.name,
            env,
            model,
            fallback,
            description,
            tags
          );
          flash(`✓ "${editingProfile.name}" 수정됨`, "success");
        } else {
          const name = editingProfile ? editingProfile.name : `profile-${Date.now()}`;
          manager.addProfile(name, env, model, fallback, description, tags);
          flash(`✓ "${name}" 추가됨`, "success");
        }
        reload();
        setView("detail");
        setFormStepIdx(0);
        setFormData({ provider: "anthropic" });
        setEditingProfile(null);
      } catch (err) {
        flash(`✗ ${err.message}`, "danger");
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

  const formState = {
    step: formStepName,
    formData,
    setFormData,
    onNext: goFormNext,
    onPrev: goFormPrev,
    isEdit,
  };

  return e(
    Box,
    { flexDirection: "column", width: "100%", height: "100%" },
    e(StatusBar, {
      activeProfile,
      view,
      mode: searchMode ? "검색" : null,
      message,
    }),
    e(
      Box,
      { flexGrow: 1, flexDirection: "row" },
      e(Sidebar, {
        profiles,
        activeProfile,
        selectedIndex,
        searchMode,
        searchValue,
        onSearchChange: (v) => {
          setSearchValue(v);
          setSelectedIndex(0);
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
        })
      )
    ),
    e(Footer)
  );
}