#!/usr/bin/env node
// Artifact bisect: outbound dump 1개로 T1~T5 sanitize 단계별 재전송.
// 사용법 (PowerShell):
//   $dump = "C:\Users\rudylee\.claude-api-manager\cam-outbound-1-1788962121621.json"
//   node test/artifact-bisect.cjs "$dump" T1
//   node test/artifact-bisect.cjs "$dump" T2
//   ... T3, T4, T5
// 따옴표 이스케이프 문제를 피하기 위해 -e 대신 파일로 제공한다.
"use strict";
const fs = require("fs");

const level = process.argv[3] || "T1";
const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error('사용법: node test/artifact-bisect.cjs "<dump.json>" T1|T2|T3|T4|T5');
  process.exit(2);
}

function walk(o, fn) {
  if (Array.isArray(o)) { o.forEach((v) => walk(v, fn)); return; }
  if (o && typeof o === "object") { fn(o); for (const k in o) walk(o[k], fn); }
}

function sanitizeOne(params, lvl) {
  walk(params, (o) => {
    if (lvl === "T1" && o.prefixItems) {
      if (!o.items) {
        o.items = o.prefixItems.length === 1 ? o.prefixItems[0] : { anyOf: o.prefixItems };
      }
      delete o.prefixItems;
    }
    // T2: additionalProperties 객체형 제거 (boolean은 유지)
    if (lvl === "T2" && o.additionalProperties && typeof o.additionalProperties === "object") {
      delete o.additionalProperties;
    }
    // T3: propertyNames 제거
    if (lvl === "T3" && o.propertyNames) delete o.propertyNames;
    // T4: const -> enum
    if (lvl === "T4" && o.const !== undefined) { o.enum = [o.const]; delete o.const; }
    // T5: $schema 제거
    if (lvl === "T5" && o.$schema) delete o.$schema;
    // T6: pattern 제거 (lookahead `(?!...)` RE2 미지원 유력 범인)
    if (lvl === "T6" && o.pattern !== undefined) delete o.pattern;
    // T7: anyOf 제거 (strict subset 밖)
    if (lvl === "T7" && o.anyOf !== undefined) delete o.anyOf;
    // T8: additionalProperties를 전부 false로 강제 (boolean true도 거부 후보)
    if (lvl === "T8" && o.additionalProperties !== undefined) o.additionalProperties = false;
  });
}

// 문자열 비교가 아닌 순서 비교 (T1<T2<T3<T4<T5<T6<T7<T8)
const order = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];
function atLeast(cur, want) { return order.indexOf(cur) >= order.indexOf(want); }

async function main() {
  const j = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));
  j.body.stream = false;
  const params = (((j.body || {}).tools || [])[0] || {}).function?.parameters
    || (((j.body || {}).tools || [])[0] || {}).parameters;
  if (!params) { console.error("dump에서 tools[0].function.parameters를 찾지 못함"); process.exit(2); }
  // 단계별 누적 적용
  if (atLeast(level, "T1")) sanitizeOne(params, "T1");
  if (atLeast(level, "T2")) sanitizeOne(params, "T2");
  if (atLeast(level, "T3")) sanitizeOne(params, "T3");
  if (atLeast(level, "T4")) sanitizeOne(params, "T4");
  if (atLeast(level, "T5")) sanitizeOne(params, "T5");
  if (atLeast(level, "T6")) sanitizeOne(params, "T6");
  if (atLeast(level, "T7")) sanitizeOne(params, "T7");
  if (atLeast(level, "T8")) sanitizeOne(params, "T8");
  const rawAuth = (j.headers && j.headers.Authorization) || "";
  const isMasked = !rawAuth || rawAuth.includes("***") || rawAuth.includes("xxxx");
  const envKey = process.env.BYNARA_KEY || process.env.BYNARA_API_KEY || "";
  const normEnv = envKey.startsWith("Bearer ") ? envKey : (envKey ? "Bearer " + envKey : "");
  if (isMasked && !normEnv) {
    console.error("401 방지: 덤프 Authorization이 마스킹됨. $env:BYNARA_KEY 에 실제 키를 설정 후 재실행");
    process.exit(2);
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: isMasked ? normEnv : rawAuth,
  };
  const r = await fetch(j.url, { method: "POST", headers, body: JSON.stringify(j.body) });
  const text = await r.text();
  console.log(level + ":", r.status, text.slice(0, 300));
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
