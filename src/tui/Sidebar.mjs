"use strict";
import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { colors, mask, providerName, detectProvider } from "./theme.mjs";
import { useI18n } from "./i18n.mjs";

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
      ? e(Text, { color: colors.yellow, wrap: "truncate-end" }, " [" + profile.tags.join(",") + "]")
      : null;

  return e(
    Box,
    { flexDirection: "column" },
    e(
      Box,
      null,
      e(Text, { color: indicatorColor, wrap: "truncate-end" }, indicator),
      e(Text, { color: activeColor, wrap: "truncate-end" }, activeMark + " "),
      e(
        Text,
        { color: nameColor, bold: isSelected && isFocused, wrap: "truncate-end" },
        profile.name
      ),
      tags
    ),
    e(
      Box,
      null,
      e(
        Text,
        { color: colors.muted, wrap: "truncate-end" },
        "    " + providerName(provider)
      )
    ),
    profile.env.ANTHROPIC_BASE_URL
      ? e(
          Box,
          null,
          e(
            Text,
            { color: colors.muted, wrap: "truncate-end" },
            "    " + profile.env.ANTHROPIC_BASE_URL
          )
        )
      : null
  );
}

function getTerminalRows() {
  return process.stdout.rows || 30;
}

// 각 프로필이 몇 줄을 차지하는지 계산 (truncate-end로 줄바꿈 없음)
function getItemLineCount() {
  // 이름(1) + 공급자(1) + URL(1) + marginBottom(1) = 4
  return 4;
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
  manualScroll = 0,
  heightOffset = 5,
  isFocused = true,
}) {
  const [rows, setRows] = useState(getTerminalRows());
  const { t } = useI18n();

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

  // 레이아웃 줄 수:
  // 헤더: 제목(1) + margin(1) + 검색박스[border 2 + 입력 1](3) + margin(1) = 6
  const HEADER_LINES = 6;
  // 푸터: 인디케이터 marginTop(1) + 텍스트(1) = 2
  const FOOTER_LINES = enriched.length > 1 ? 2 : 0;
  // 외부 Box의 round border (위 1 + 아래 1)
  const BORDER_LINES = 2;
  const availableHeight = Math.max(5, rows - heightOffset);
  const contentHeight = availableHeight - BORDER_LINES - HEADER_LINES - FOOTER_LINES;
  const ITEM_LINES = getItemLineCount();

  // 특정 scroll 위치에서 몇 개가 보이는지 계산
  function calcVisibleCount(scrollPos) {
    return Math.max(
      1,
      Math.floor(contentHeight / ITEM_LINES)
    );
  }

  // 1. manualScroll 기준 초기 위치 (j/k로 수동 스크롤)
  let actualScroll = Math.max(0, Math.min(manualScroll, Math.max(0, enriched.length - 1)));

  // 2. selectedIndex가 보이도록 follow (순수 파생, 렌더마다 항상 일관)
  const vis1 = calcVisibleCount(actualScroll);
  if (selectedIndex < actualScroll) {
    actualScroll = selectedIndex;
  } else if (selectedIndex >= actualScroll + vis1) {
    actualScroll = Math.max(0, selectedIndex - vis1 + 1);
  }

  // 3. 최종 visibleCount 계산 후 클램프
  const visibleCount = calcVisibleCount(actualScroll);
  const maxScroll = Math.max(0, enriched.length - visibleCount);
  actualScroll = Math.max(0, Math.min(actualScroll, maxScroll));

  // 4. 클램프로 visibleCount가 바뀌었으면 follow 다시 확인
  const vis2 = calcVisibleCount(actualScroll);
  if (selectedIndex >= actualScroll + vis2) {
    actualScroll = Math.max(0, selectedIndex - vis2 + 1);
    actualScroll = Math.max(0, Math.min(actualScroll, maxScroll));
  }

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
      e(Text, { color: colors.muted }, " (" + profiles.length + ")")
    ),
    e(
      Box,
      { borderStyle: "single", borderColor: "gray", paddingX: 1, marginBottom: 1, flexShrink: 0 },
      searchMode
        ? e(TextInput, {
            value: searchValue,
            onChange: onSearchChange,
            onSubmit: onSearchExit,
            placeholder: t("searchPlaceholder"),
          })
        : e(
            Text,
            { color: colors.muted },
            e(Text, { backgroundColor: "gray", color: "white" }, " / "),
            e(Text, null, t("searchOrType"))
          )
    ),
    // visible 항목들 (slice만 사용)
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
          e(Text, { color: colors.warning }, "  " + t("noMatch"))
        )
      : null,
    // 스크롤 인디케이터 (항상 표시, 현재 위치 포함)
    enriched.length > 1
      ? e(
          Box,
          { marginTop: 1, flexShrink: 0 },
          e(
            Text,
            { color: colors.muted, wrap: "truncate-end" },
            startIdx > 0 ? "▲ " : "  ",
            `${startIdx + 1}-${endIdx}/${enriched.length}`
          ),
          e(
            Text,
            { color: colors.primary, bold: true, wrap: "truncate-end" },
            " | pos " + (selectedIndex + 1)
          ),
          e(
            Text,
            { color: colors.muted, wrap: "truncate-end" },
            endIdx < enriched.length ? " ▼" : "  "
          )
        )
      : null
  );
}