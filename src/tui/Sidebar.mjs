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

// 각 프로필이 몇 줄을 차지하는지 계산
function getItemLineCount(profile) {
  let lines = 2; // 이름 + 공급자
  if (profile.env && profile.env.ANTHROPIC_BASE_URL) lines++; // URL
  return lines + 1; // marginBottom: 1
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

  // 헤더가 차지하는 줄 수: 제목(1) + marginBottom(1) + 검색박스(1) + marginBottom(1) = 4
  const HEADER_LINES = 4;
  // 하단 인디케이터: marginTop(1) + 텍스트(1) = 2
  const FOOTER_LINES = enriched.length > 1 ? 2 : 0;
  const availableHeight = Math.max(5, rows - heightOffset);
  const contentHeight = availableHeight - HEADER_LINES - FOOTER_LINES;

  // 특정 scroll 위치에서 몇 개가 보이는지 계산
  function calcVisibleCount(scrollPos) {
    let used = 0;
    let count = 0;
    for (let i = scrollPos; i < enriched.length; i++) {
      const itemLines = getItemLineCount(enriched[i]);
      if (used + itemLines > contentHeight && count > 0) break;
      used += itemLines;
      count++;
    }
    return Math.max(1, count);
  }

  // 1. scroll prop 기준 초기 visibleCount 계산
  const scrollVisibleCount = calcVisibleCount(scroll);

  // 2. selectedIndex가 보이도록 actualScroll 결정
  let actualScroll = scroll;
  if (selectedIndex < actualScroll) {
    actualScroll = selectedIndex;
  } else if (selectedIndex >= actualScroll + scrollVisibleCount) {
    actualScroll = Math.max(0, selectedIndex - scrollVisibleCount + 1);
  }
  actualScroll = Math.max(0, Math.min(actualScroll, Math.max(0, enriched.length - 1)));

  // 3. actualScroll 위치에서 실제 visibleCount 재계산
  const visibleCount = calcVisibleCount(actualScroll);

  // 4. visibleCount가 바뀌면 selectedIndex 보정 다시 확인
  if (selectedIndex >= actualScroll + visibleCount) {
    actualScroll = Math.max(0, selectedIndex - visibleCount + 1);
  }
  actualScroll = Math.max(0, Math.min(actualScroll, Math.max(0, enriched.length - 1)));

  // 가시 항목 수 변경 시 부모에 알림
  useEffect(() => {
    if (onVisibleCountChange) onVisibleCountChange(visibleCount);
  }, [visibleCount, onVisibleCountChange]);

  const startIdx = actualScroll;
  const endIdx = Math.min(enriched.length, startIdx + visibleCount);
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
      overflowY: "hidden",
    },
    // 헤더 (고정)
    e(
      Box,
      { marginBottom: 1, flexShrink: 0 },
      e(Text, { color: colors.brand, bold: true }, "✦ Profiles"),
      e(Text, { color: colors.muted }, " (" + list.length + "/" + profiles.length + ")")
    ),
    e(
      Box,
      { borderStyle: "single", borderColor: "gray", paddingX: 1, marginBottom: 1, flexShrink: 0 },
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
    // visible 항목들 (marginTop 없이 slice만 사용)
    ...visible.map((p, i) =>
      e(
        Box,
        { key: p.name, marginBottom: 1, flexShrink: 0 },
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
          { paddingY: 1, flexShrink: 0 },
          e(Text, { color: colors.warning }, "  일치하는 프로필 없음")
        )
      : null,
    // 스크롤 인디케이터
    enriched.length > visibleCount
      ? e(
          Box,
          { marginTop: 1, flexShrink: 0 },
          e(
            Text,
            { color: colors.muted },
            startIdx > 0 ? "▲ " : "  ",
            `${startIdx + 1}-${endIdx}/${enriched.length}`,
            endIdx < enriched.length ? " ▼" : "  "
          )
        )
      : null
  );
}