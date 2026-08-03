"use strict";
import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { colors, mask, providerName, detectProvider } from "./theme.mjs";

const e = React.createElement;

function SidebarItem({ profile, isSelected, isFocused }) {
  const provider = detectProvider(profile.env);
  const indicator = isSelected
    ? isFocused ? "▶ " : "▶ "
    : "  ";
  const indicatorColor = isSelected
    ? isFocused ? colors.brand : colors.primary
    : colors.muted;
  const activeMark = profile.isActive ? "●" : "○";
  const activeColor = profile.isActive ? colors.success : colors.muted;
  const nameColor = isSelected && isFocused ? colors.brand : colors.primary;

  const tags =
    profile.tags && profile.tags.length > 0
      ? e(Text, { color: colors.yellow }, " [" + profile.tags.join(",") + "]")
      : null;

  return e(
    Box,
    { flexDirection: "column" },
    e(
      Box,
      null,
      e(Text, { color: indicatorColor }, indicator),
      e(Text, { color: activeColor }, activeMark + " "),
      e(Text, { color: nameColor, bold: isSelected && isFocused }, profile.name),
      tags
    ),
    e(
      Box,
      null,
      e(Text, { color: colors.muted }, "    " + providerName(provider))
    ),
    profile.env.ANTHROPIC_BASE_URL
      ? e(Box, null, e(Text, { color: colors.muted }, "    " + profile.env.ANTHROPIC_BASE_URL))
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
      e(Text, { color: colors.brand, bold: true }, "✦ Profiles"),
      e(Text, { color: colors.muted }, " (" + list.length + "/" + profiles.length + ")")
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
            { color: colors.muted },
            e(Text, { backgroundColor: "gray", color: "white" }, " / "),
            e(Text, null, " 검색 또는 이름 입력")
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
          e(Text, { color: colors.warning }, "  일치하는 프로필 없음")
        )
      : null
  );
}