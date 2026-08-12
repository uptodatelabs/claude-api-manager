"use strict";
import React from "react";
import { render } from "ink";
import { Writable } from "stream";
import StatusBar from "./src/tui/StatusBar.mjs";
import Footer from "./src/tui/Footer.mjs";
import { I18nContext, translations } from "./src/tui/i18n.mjs";

const e = React.createElement;

const i18n = {
  lang: "en",
  setLang: () => {},
  t: (key, params) => {
    let s = translations.en[key] || key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.split("{" + k + "}").join(v);
    return s;
  },
};

function makeOut(width) {
  let buffer = "";
  const out = new Writable({
    write(chunk, enc, cb) {
      buffer += chunk.toString();
      cb();
    },
  });
  out.columns = width;
  out.rows = 40;
  out.isTTY = true;
  return { out, get: () => buffer };
}

async function test(name, width, node) {
  const { out, get } = makeOut(width);
  const inst = render(e(I18nContext.Provider, { value: i18n }, node), { stdout: out });
  await new Promise((r) => setTimeout(r, 300));
  inst.unmount();
  const buf = get().replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
  const lines = buf.split("\n").filter((l) => l.trim().length > 0 && !l.includes("?25"));
  console.log(`[${name}] width=${width}: 라인 수=${lines.length}`);
}

const sb = e(StatusBar, {
  activeProfile: "ollama-deepseek-v4-flash",
  view: "detail",
  lang: "en",
  proxyRunning: true,
  proxyProfile: "openai",
  proxyPort: 3456,
  proxyFilter: true,
});

const ft = e(Footer);

for (const w of [120, 110, 105, 100, 95, 90, 88, 85, 80]) {
  await test("StatusBar", w, sb);
}
console.log("");
for (const w of [120, 110, 100, 95, 90, 88, 85, 80]) {
  await test("Footer", w, ft);
}
process.exit(0);