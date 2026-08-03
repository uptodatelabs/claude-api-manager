"use strict";
const React = require("react");
const { Box, Text, useInput, useApp } = require("ink");
const StatusBar = require("./StatusBar");
const Footer = require("./Footer");
const Sidebar = require("./Sidebar");
const MainPanel = require("./MainPanel");
const { theme, detectProvider } = require("./theme");
const manager = require("../manager");

const STEPS = ["provider", "anthropic_keys", "model", "meta", "confirm"];

function App({ initialView }) {
  const { exit } = useApp();
  const [profiles, setProfiles] = React.useState([]);
  const [activeProfile, setActiveProfile] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [searchMode, setSearchMode] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [view, setView] = React.useState(initialView || "empty");
  const [currentSettings, setCurrentSettings] = React.useState(null);
  const [message, setMessage] = React.useState(null);
  const [formStep, setFormStep] = React.useState(0);
  const [formData, setFormData] = React.useState({});
  const [editingProfile, setEditingProfile] = React.useState(null);

  const reload = () => {
    const list = manager.listProfiles();
    setProfiles(list);
    setActiveProfile(manager.getActiveProfileName());
    const settings = manager.readSettings();
    setCurrentSettings(settings);
    if (list.length > 0 && selectedIndex >= list.length) {
      setSelectedIndex(Math.max(0, list.length - 1));
    }
  };

  React.useEffect(() => {
    reload();
  }, []);

  const flashMessage = (msg, durationMs = 2500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), durationMs);
  };

  const filteredProfiles = searchValue
    ? profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchValue.toLowerCase())) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchValue.toLowerCase())))
      )
    : profiles;

  const selectedProfile = filteredProfiles[selectedIndex] || profiles[selectedIndex];

  useInput((input, key) => {
    if (view === "diff" || view === "form") return;
    if (searchMode) return;

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      setView("detail");
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filteredProfiles.length - 1, i + 1));
      setView("detail");
    }

    if (input === "/") {
      setSearchMode(true);
      setView("detail");
    }

    if (input === "?" || input === "h") {
      setView("help");
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
      setFormStep(1);
      const fd = {
        provider: detectProvider(p.env),
        ...p.env,
        model: p.model || "",
        fallbackModel: p.fallbackModel ? p.fallbackModel.join(", ") : "",
        description: p.description || "",
        tags: p.tags ? p.tags.join(", ") : "",
      };
      delete fd.model;
      delete fd.fallbackModel;
      delete fd.description;
      delete fd.tags;
      fd.model = p.model || "";
      fd.fallbackModel = p.fallbackModel ? p.fallbackModel.join(", ") : "";
      fd.description = p.description || "";
      fd.tags = p.tags ? p.tags.join(", ") : "";
      setFormData(fd);
      setView("form");
    }

    if (input === "d" && selectedProfile) {
      const name = selectedProfile.name;
      try {
        manager.removeProfile(name);
        flashMessage(theme.success(`✓ "${name}" 삭제됨`));
        reload();
      } catch (err) {
        flashMessage(theme.danger(`✗ ${err.message}`));
      }
    }

    if (input === "n") {
      setEditingProfile(null);
      setFormStep(0);
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

  React.useEffect(() => {
    if (view === "diff" && selectedProfile) {
      const handler = (data) => {
        if (data === "\r" || data === "y") {
          try {
            manager.applyProfile(selectedProfile.name);
            flashMessage(theme.success(`✓ "${selectedProfile.name}" 적용됨`));
            reload();
            setView("detail");
          } catch (err) {
            flashMessage(theme.danger(`✗ ${err.message}`));
            setView("detail");
          }
        } else {
          setView("detail");
        }
      };
      process.stdin.once("data", handler);
      return () => process.stdin.removeListener("data", handler);
    }
  }, [view, selectedProfile]);

  const handleSearchChange = (val) => {
    setSearchValue(val);
    setSelectedIndex(0);
  };

  const handleSearchExit = () => {
    setSearchMode(false);
    setSearchValue("");
  };

  React.useEffect(() => {
    if (searchMode) {
      const onData = (data) => {
        if (data === "\u001b" || data === "\u0003") {
          handleSearchExit();
        }
      };
      process.stdin.on("data", onData);
      return () => process.stdin.removeListener("data", onData);
    }
  }, [searchMode]);

  const formStepName = STEPS[formStep];
  const isEdit = !!editingProfile;

  const goFormNext = () => {
    if (formStep === 0) {
      setFormStep(1);
    } else if (formStep === 4) {
      try {
        const env = {};
        Object.entries(formData).forEach(([k, v]) => {
          const trimmed = (v || "").trim();
          if (!trimmed || trimmed === "-") return;
          if (["provider", "model", "fallbackModel", "description", "tags"].includes(k)) return;
          env[k] = trimmed;
        });
        if (formData.provider === "bedrock") env.CLAUDE_CODE_USE_BEDROCK = "1";
        if (formData.provider === "vertex") env.CLAUDE_CODE_USE_VERTEX = "1";
        if (formData.provider === "foundry") env.CLAUDE_CODE_USE_FOUNDRY = "1";

        const model = formData.model ? formData.model.trim() : null;
        const fallback = formData.fallbackModel
          ? formData.fallbackModel.split(",").map((s) => s.trim()).filter(Boolean)
          : null;
        const description = formData.description && formData.description.trim() !== "-"
          ? formData.description.trim()
          : null;
        const tags = formData.tags
          ? formData.tags.split(",").map((s) => s.trim()).filter(Boolean)
          : null;

        if (isEdit) {
          manager.updateProfile(editingProfile.name, env, model, fallback, description, tags);
          flashMessage(theme.success(`✓ "${editingProfile.name}" 수정됨`));
        } else {
          const name = editingProfile ? editingProfile.name : `profile-${Date.now()}`;
          manager.addProfile(name, env, model, fallback, description, tags);
          flashMessage(theme.success(`✓ "${name}" 추가됨`));
        }
        reload();
        setView("detail");
        setFormStep(0);
        setFormData({});
        setEditingProfile(null);
      } catch (err) {
        flashMessage(theme.danger(`✗ ${err.message}`));
      }
    } else {
      setFormStep(formStep + 1);
    }
  };

  const goFormPrev = () => {
    if (formStep === 0) {
      setView("detail");
    } else {
      setFormStep(formStep - 1);
    }
  };

  const formState = {
    step: formStepName,
    formData: formData,
    setFormData: setFormData,
    onNext: goFormNext,
    onPrev: goFormPrev,
    onSubmit: goFormNext,
    isEdit: isEdit,
  };

  return React.createElement(Box, {
    flexDirection: "column",
    width: "100%",
    height: "100%",
  },
    React.createElement(StatusBar, {
      activeProfile: activeProfile,
      view: view,
      mode: searchMode ? "검색" : (message ? null : null),
      message: message,
    }),

    React.createElement(Box, { flexGrow: 1, flexDirection: "row" },
      React.createElement(Sidebar, {
        profiles: profiles,
        activeProfile: activeProfile,
        selectedIndex: selectedIndex,
        searchMode: searchMode,
        searchValue: searchValue,
        onSelect: (i) => setSelectedIndex(i),
        onHover: (e) => {
          if (e.type === "search-change") handleSearchChange(e.value);
          if (e.type === "search-exit") handleSearchExit();
        },
      }),

      React.createElement(Box, { flexGrow: 1, flexDirection: "column", paddingX: 1 },
        React.createElement(MainPanel, {
          view: view,
          profile: selectedProfile,
          currentSettings: currentSettings,
          formState: formState,
          setFormState: setFormData,
          onApply: () => {
            try {
              manager.applyProfile(selectedProfile.name);
              flashMessage(theme.success(`✓ "${selectedProfile.name}" 적용됨`));
              reload();
              setView("detail");
            } catch (err) {
              flashMessage(theme.danger(`✗ ${err.message}`));
            }
          },
          onCancelApply: () => setView("detail"),
        })
      )
    ),

    React.createElement(Footer, null)
  );
}

module.exports = App;