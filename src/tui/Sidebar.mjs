"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { colors, mask, providerName, detectProvider } from "./theme.mjs";

const e = React.createElement;

function SidebarItem({ profile, isSelected, isFocused }) {
  const provider = detectProvider(profile.env);
  const indicator = isSelected ? "▶ " : "  ";
  const indicatorColor = isSelected
    ? isFocused ? colors.brand : colors.muted
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

function getTerminalRows() {
  return process.stdout.rows || 30;
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
  scroll = 0,
  heightOffset = 5,
  isFocused = true,
  onVisibleCountChange,
}) {
  const [rows, setRows] = useState(getTerminalRows());

  useEffect(() => {
    const onResize = () => setRows(getTerminalRows());
    process.stdout.on("resize", onResize);
    return () => process.stdout.off("resize", onResize);
  }, []);

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

  // 화면에 보이는 항목 계산
  const LINES_PER_ITEM = 3;
  const HEADER_LINES = 3;
  const availableHeight = Math.max(5, rows - heightOffset);
  const visibleItems = Math.max(
    1,
    Math.floor((availableHeight - HEADER_LINES) / LINES_PER_ITEM)
  );

  // 가시 항목 수 변경 시 부모에 알림
  useEffect(() => {
    if (onVisibleCountChange) onVisibleCountChange(visibleItems);
  }, [visibleItems, onVisibleCountChange]);

  // 외부 scroll prop을 우선 사용 (사용자가 j/k로 직접 스크롤)
  // 단, selectedIndex가 화면 밖이면 selectedIndex 위치로 자동 보정
  let actualScroll = scroll;
  if (selectedIndex < actualScroll) actualScroll = selectedIndex;
  if (selectedIndex >= actualScroll + visibleItems) {
    actualScroll = selectedIndex - visibleItems + 1;
  }
  actualScroll = Math.max(0, Math.min(actualScroll, Math.max(0, enriched.length - visibleItems)));

  const startIdx = actualScroll;
  const endIdx = Math.min(enriched.length, startIdx + visibleItems);
  const visible = enriched.slice(startIdx, endIdx);

  const borderColor = isFocused ? "cyan" : "gray";

  return e(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor,
      width: width || 28,
      paddingX: 1,
      flexGrow: 0,
      flexShrink: 0,
      height: availableHeight,
      minHeight: availableHeight,
      overflowY: "hidden",
    },
    e(
      Box,
      { flexDirection: "column", flexShrink: 0, marginTop: -scroll },
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
      ...visible.map((p, i) =>
        e(
          Box,
          { key: p.name, marginBottom: 1 },
          e(SidebarItem, {
            profile: p,
            isSelected: startIdx + i === selectedIndex,
            isFocused: isFocused,
          })
        )
      ),
      enriched.length === 0
        ? e(
            Box,
            { paddingY: 1 },
            e(Text, { color: colors.warning }, "  일치하는 프로필 없음")
          )
        : null,
      enriched.length > visibleItems
        ? e(
            Box,
            { marginTop: 1 },
            e(
              Text,
              { color: colors.muted },
              startIdx > 0 ? "▲ " : "  ",
              `${startIdx + 1}-${endIdx}/${enriched.length}`,
              endIdx < enriched.length ? " ▼" : "  "
            )
          )
        : null
    )
  );
}