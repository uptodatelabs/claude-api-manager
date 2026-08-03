"use strict";
const React = require("react");
const { Box, Text, useInput } = require("ink");
const TextInput = require("ink-text-input").default;
const { theme, mask, providerName, detectProvider } = require("./theme");

function isSensitive(key) {
  return /KEY|SECRET|TOKEN|PASSWORD/.test(key);
}

function SidebarItem({ profile, isSelected, isActive, isFocused }) {
  const provider = detectProvider(profile.env);
  const indicator = isSelected ? (isFocused ? theme.brand("▶ ") : theme.primary("▶ ")) : "  ";
  const activeMark = isActive ? theme.success("●") : theme.muted("○");
  const name = isSelected && isFocused ? theme.brand(profile.name) : theme.primary(profile.name);

  const tags = profile.tags && profile.tags.length > 0
    ? React.createElement(Text, { color: "yellow" }, " [", profile.tags.join(","), "]")
    : null;

  return React.createElement(Box, { flexDirection: "column" },
    React.createElement(Box, null,
      indicator,
      activeMark,
      " ",
      name,
      tags
    ),
    React.createElement(Box, null,
      theme.subtle("    "),
      React.createElement(Text, { color: "gray" }, providerName(provider))
    ),
    profile.env.ANTHROPIC_BASE_URL
      ? React.createElement(Box, null,
          theme.subtle("    "),
          React.createElement(Text, { color: "gray" }, profile.env.ANTHROPIC_BASE_URL))
      : null
  );
}

function Sidebar({ profiles, activeProfile, selectedIndex, searchMode, searchValue, onSelect, onHover, width }) {
  const filtered = searchValue
    ? profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchValue.toLowerCase())) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchValue.toLowerCase())))
      )
    : profiles;

  const list = filtered.length > 0 ? filtered : profiles;

  return React.createElement(Box, {
    flexDirection: "column",
    borderStyle: "round",
    borderColor: "cyan",
    width: width || 28,
    paddingX: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
    React.createElement(Box, { marginBottom: 1 },
      theme.brand("✦ Profiles"),
      React.createElement(Text, { color: "gray" }, ` (${list.length}/${profiles.length})`)
    ),
    React.createElement(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, marginBottom: 1 },
      searchMode
        ? React.createElement(TextInput, {
            value: searchValue,
            onChange: (v) => onHover({ type: "search-change", value: v }),
            onSubmit: () => onHover({ type: "search-exit" }),
            placeholder: "검색 (이름/태그/설명)",
          })
        : React.createElement(Text, { color: "gray" },
            React.createElement(Text, { backgroundColor: "gray", color: "white" }, " / "),
            " 검색 또는 이름 입력"
          )
    ),
    ...list.map((p, i) =>
      React.createElement(Box, {
        key: p.name,
        marginBottom: 1,
      },
        React.createElement(SidebarItem, {
          profile: p,
          isSelected: i === selectedIndex,
          isActive: p.name === activeProfile,
          isFocused: !searchMode,
        })
      )
    ),
    list.length === 0
      ? React.createElement(Box, { paddingY: 1 },
          React.createElement(Text, { color: "yellow" }, "  일치하는 프로필 없음"))
      : null
  );
}

module.exports = Sidebar;