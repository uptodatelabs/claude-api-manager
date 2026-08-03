"use strict";
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { theme, mask, providerName, detectProvider } from "./theme.mjs";

const e = React.createElement;

function SidebarItem({ profile, isSelected, isFocused }) {
  const provider = detectProvider(profile.env);
  const indicator = isSelected
    ? isFocused
      ? theme.brand("▶ ")
      : theme.primary("▶ ")
    : "  ";
  const activeMark = profile.isActive ? theme.success("●") : theme.muted("○");
  const name =
    isSelected && isFocused ? theme.brand(profile.name) : theme.primary(profile.name);

  const tags =
    profile.tags && profile.tags.length > 0
      ? e(Text, { color: "yellow" }, " [", profile.tags.join(","), "]")
      : null;

  return e(
    Box,
    { flexDirection: "column" },
    e(Box, null, indicator, activeMark, " ", name, tags),
    e(Box, null, theme.subtle("    "), e(Text, { color: "gray" }, providerName(provider))),
    profile.env.ANTHROPIC_BASE_URL
      ? e(Box, null, theme.subtle("    "), e(Text, { color: "gray" }, profile.env.ANTHROPIC_BASE_URL))
      : null
  );
}

export default function Sidebar({
  profiles,
  activeProfile,
  selectedIndex,
  searchMode,
  searchValue,
  onSearchChange,
  onSearchExit,
  width,
}) {
  const filtered = searchValue
    ? profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (p.description &&
            p.description.toLowerCase().includes(searchValue.toLowerCase())) ||
          (p.tags &&
            p.tags.some((t) => t.toLowerCase().includes(searchValue.toLowerCase())))
      )
    : profiles;

  const list = filtered.length > 0 ? filtered : profiles;
  const enriched = list.map((p) => ({ ...p, isActive: p.name === activeProfile }));

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "cyan",
      width: width || 28,
      paddingX: 1,
      flexGrow: 0,
      flexShrink: 0,
    },
    e(
      Box,
      { marginBottom: 1 },
      theme.brand("✦ Profiles"),
      e(Text, { color: "gray" }, ` (${list.length}/${profiles.length})`)
    ),
    e(
      Box,
      { borderStyle: "single", borderColor: "gray", paddingX: 1, marginBottom: 1 },
      searchMode
        ? e(TextInput, {
            value: searchValue,
            onChange: onSearchChange,
            onSubmit: onSearchExit,
            placeholder: "검색 (이름/태그/설명)",
          })
        : e(
            Text,
            { color: "gray" },
            e(Text, { backgroundColor: "gray", color: "white" }, " / "),
            " 검색 또는 이름 입력"
          )
    ),
    ...enriched.map((p, i) =>
      e(
        Box,
        { key: p.name, marginBottom: 1 },
        e(SidebarItem, {
          profile: p,
          isSelected: i === selectedIndex,
          isFocused: !searchMode,
        })
      )
    ),
    enriched.length === 0
      ? e(
          Box,
          { paddingY: 1 },
          e(Text, { color: "yellow" }, "  일치하는 프로필 없음")
        )
      : null
  );
}