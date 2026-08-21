#!/usr/bin/env node

import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { createRequire } from "module";
import chalk from "chalk";

const require = createRequire(import.meta.url);
const manager = require("../src/manager.cjs");
const { ProxyServer, findPidOnPort, getProcessName, killPids } = require("../src/proxy/server.cjs");
const App = (await import("../src/tui/App.mjs")).default;

function mask(value) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

const NAMES = {
  anthropic: "Anthropic API",
  bedrock: "Amazon Bedrock",
  vertex: "Google Agent Platform",
  foundry: "Microsoft Foundry",
  aws: "Claude Platform on AWS",
};

function providerName(provider) {
  return NAMES[provider] || provider;
}

function detectProvider(envVars) {
  if (!envVars) return "anthropic";
  if (envVars.CLAUDE_CODE_USE_BEDROCK === "1") return "bedrock";
  if (envVars.CLAUDE_CODE_USE_VERTEX === "1") return "vertex";
  if (envVars.CLAUDE_CODE_USE_FOUNDRY === "1") return "foundry";
  if (envVars.ANTHROPIC_AWS_WORKSPACE_ID) return "aws";
  return "anthropic";
}

const program = new Command();

program
  .name("cam")
  .description("Claude API Manager - settings.json의 API 설정을 관리하는 TUI")
  .version("2.3.1");

program
  .command("list")
  .alias("ls")
  .description("저장된 API 프로필 목록 표시")
  .option("-t, --tag <tag>", "특정 태그로 필터링")
  .action((opts) => {
    const profiles = manager.listProfiles();
    const activeName = manager.getActiveProfileName();
    const filtered = opts.tag
      ? profiles.filter((p) => p.tags && p.tags.includes(opts.tag))
      : profiles;

    if (filtered.length === 0) {
      if (opts.tag) console.log(`태그 "${opts.tag}"에 해당하는 프로필이 없습니다.`);
      else console.log("저장된 프로필이 없습니다. cam add <name> 으로 추가하세요.");
      return;
    }

    console.log(chalk.bold("\n저장된 API 프로필:\n"));
    for (const p of filtered) {
      const marker = p.name === activeName ? chalk.green("●") : chalk.gray("○");
      const tags = p.tags && p.tags.length > 0 ? chalk.yellow(` [${p.tags.join(",")}]`) : "";
      console.log(`  ${marker} ${chalk.cyan(p.name)}${tags}`);
      if (p.description) console.log(`      ${chalk.gray(p.description)}`);
      const provider = detectProvider(p.env);
      console.log(`      ${chalk.gray(providerName(provider))}`);
      if (p.env.ANTHROPIC_API_KEY) console.log(`      ${chalk.gray("API Key:")} ${mask(p.env.ANTHROPIC_API_KEY)}`);
      if (p.env.ANTHROPIC_AUTH_TOKEN) console.log(`      ${chalk.gray("Auth Token:")} ${mask(p.env.ANTHROPIC_AUTH_TOKEN)}`);
      if (p.env.ANTHROPIC_BASE_URL) console.log(`      ${chalk.gray("Base URL:")} ${p.env.ANTHROPIC_BASE_URL}`);
      if (p.model) console.log(`      ${chalk.gray("Model:")} ${p.model}`);
      console.log();
    }
  });

program
  .command("show <name>")
  .description("프로필 상세 정보 표시")
  .action((name) => {
    const profile = manager.getProfile(name);
    if (!profile) {
      console.log(chalk.red(`프로필 "${name}"을(를) 찾을 수 없습니다.`));
      return;
    }
    if (profile.description) console.log(`${chalk.bold("설명:")} ${profile.description}`);
    if (profile.tags && profile.tags.length > 0) {
      console.log(`${chalk.bold("태그:")} ${profile.tags.join(", ")}`);
    }
    console.log(`\n${chalk.bold("env:")}`);
    const env = profile.env || {};
    for (const [key, value] of Object.entries(env)) {
      if (/KEY|SECRET|TOKEN/.test(key)) {
        console.log(`  ${chalk.cyan(key)} = ${chalk.gray(mask(value))}`);
      } else {
        console.log(`  ${chalk.cyan(key)} = ${value}`);
      }
    }
    if (profile.model) console.log(`\n${chalk.bold("model:")} ${profile.model}`);
    if (profile.fallbackModel) {
      console.log(`${chalk.bold("fallbackModel:")} ${profile.fallbackModel.join(", ")}`);
    }
  });

program
  .command("apply <name>")
  .description("settings.json에 프로필 적용")
  .action((name) => {
    try {
      manager.applyProfile(name);
      console.log(chalk.green(`\n✓ "${name}" 적용됨`));
      console.log(chalk.dim(`  settings.json: ${manager.getSettingsPath()}\n`));
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("current")
  .description("현재 활성 프로필 표시")
  .action(() => {
    const name = manager.getActiveProfileName();
    if (!name) {
      console.log("활성 프로필이 없습니다. cam apply <name> 으로 적용하세요.");
      return;
    }
    const p = manager.getProfile(name);
    console.log(chalk.bold(`\n활성 프로필: ${chalk.cyan(name)}\n`));
    for (const [k, v] of Object.entries(p.env || {})) {
      console.log(`  ${chalk.cyan(k)} = ${/KEY|SECRET|TOKEN/.test(k) ? chalk.gray(mask(v)) : v}`);
    }
  });

program
  .command("path")
  .description("settings.json 경로 확인/변경")
  .option("-s, --set <path>", "settings.json 경로 변경")
  .action((opts) => {
    if (opts.set) {
      manager.setSettingsPath(opts.set);
      console.log(chalk.green(`경로 변경됨: ${opts.set}`));
    } else {
      console.log(`\n${chalk.bold("settings.json 경로:")} ${manager.getSettingsPath()}`);
      console.log(`${chalk.bold("기본값:")} ${manager.getDefaultSettingsPath()}\n`);
    }
  });

program
  .command("export <file>")
  .description("모든 프로필을 JSON 파일로 내보내기")
  .action((file) => {
    const exportedPath = manager.exportProfiles(file);
    const profiles = manager.listProfiles();
    console.log(chalk.green(`\n${profiles.length}개 프로필을 ${exportedPath}로 내보냈습니다.\n`));
  });

program
  .command("import <file>")
  .description("JSON 파일에서 프로필 가져오기")
  .option("-f, --force", "기존 프로필 덮어쓰기")
  .action((file, opts) => {
    try {
      const { imported, skipped } = manager.importProfiles(file, opts.force);
      console.log(chalk.green(`\n${imported.length}개 가져옴`));
      if (skipped.length > 0) console.log(chalk.yellow(`${skipped.length}개 건너뜀`));
      console.log();
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("config")
  .description("설정 파일 경로 표시")
  .action(() => {
    console.log(`\n${chalk.bold("설정 파일:")} ${manager.getDataPath()}\n`);
  });

program
  .command("rename <oldName> <newName>")
  .description("프로필 이름 변경")
  .action((oldName, newName) => {
    try {
      manager.renameProfile(oldName, newName);
      console.log(chalk.green(`"${oldName}" → "${newName}"`));
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("capture <name>")
  .description("현재 settings.json을 새 프로필로 저장")
  .action((name) => {
    try {
      manager.captureProfile(name);
      console.log(chalk.green(`"${name}" 캡처됨`));
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("copy <srcName> <dstName>")
  .description("프로필 복제")
  .action((srcName, dstName) => {
    try {
      manager.copyProfile(srcName, dstName);
      console.log(chalk.green(`"${srcName}" → "${dstName}" 복제됨`));
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("프로필 삭제")
  .action((name) => {
    try {
      manager.removeProfile(name);
      console.log(chalk.green(`"${name}" 삭제됨`));
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("proxy <name>")
  .description("OpenAI 호환 API 프록시 서버 시작")
  .option("-p, --port <port>", "프록시 서버 포트", "3456")
  .option("-m, --model <model>", "OpenAI API 모델 오버라이드")
  .option("-d, --debug", "디버그 로그 출력 (요청/응답 상태)")
  .option("-f, --force", "포트가 점유 중이면 점유 프로세스를 종료하고 시작")
  .option("-r, --rate-limit <n>", "분당 최대 요청 수 (0=무제한). 프로필 CAM_RATE_LIMIT보다 우선")
  .action(async (name, opts) => {
    try {
      const profile = manager.getProfile(name);
      if (!profile) {
        console.log(chalk.red(`프로필 "${name}"을(를) 찾을 수 없습니다.`));
        return;
      }

      const env = profile.env || {};
      const baseUrl = env.ANTHROPIC_BASE_URL || env.OPENAI_BASE_URL || "";
      const apiKey = env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.OPENAI_API_KEY || "";
      const model = opts.model || env.ANTHROPIC_MODEL || "";

      // 레이트 리밋: CLI --rate-limit > 프로필 CAM_RATE_LIMIT > 0(무제한)
      let rateLimit = 0;
      const envRl = parseInt(env.CAM_RATE_LIMIT, 10);
      if (opts.rateLimit !== undefined && opts.rateLimit !== "") {
        rateLimit = parseInt(opts.rateLimit, 10) || 0;
      } else if (Number.isFinite(envRl)) {
        rateLimit = envRl;
      }

      if (!baseUrl) {
        console.log(chalk.red(`프로필 "${name}"에 ANTHROPIC_BASE_URL 또는 OPENAI_BASE_URL이 설정되어 있지 않습니다.`));
        return;
      }

      const port = parseInt(opts.port, 10);
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        console.log(chalk.red(`오류: 잘못된 포트입니다: ${opts.port}`));
        return;
      }

      const makeServer = () =>
        new ProxyServer({
          port,
          targetUrl: baseUrl,
          apiKey,
          model,
          profileName: name,
          manager,
          debug: !!opts.debug,
          rateLimit,
        });

      let server;
      try {
        server = makeServer();
        await server.start();
      } catch (err) {
        if (err.code === "EADDRINUSE") {
          // 점유 프로세스 정보 확인
          let detail = "";
          let pids = [];
          try {
            pids = await findPidOnPort(port);
            const names = [];
            for (const pid of pids) {
              const pname = await getProcessName(pid);
              names.push(pname ? `${pname} (PID ${pid})` : `PID ${pid}`);
            }
            if (names.length > 0) detail = ` — 점유 중: ${names.join(", ")}`;
          } catch {}

          if (opts.force && pids.length > 0) {
            console.log(chalk.yellow(`포트 ${port} 점유 프로세스 종료: PID ${pids.join(", ")}`));
            killPids(pids);
            await new Promise((r) => setTimeout(r, 300));
            server = makeServer();
            await server.start();
          } else {
            console.log(chalk.red(`오류: 포트 ${port}이(가) 이미 사용 중입니다.${detail}`));
            console.log();
            console.log(chalk.dim(`  다른 포트로 실행:           cam proxy ${name} --port <새 포트>`));
            console.log(chalk.dim(`  점유 프로세스 종료 후 시작:   cam proxy ${name} --force`));
            return;
          }
        } else {
          console.log(chalk.red(`오류: ${err.message}`));
          return;
        }
      }

      console.log(chalk.green(`\n✓ 프록시 시작됨`));
      console.log(chalk.dim(`  프로필: ${name}`));
      console.log(chalk.dim(`  프록시: http://127.0.0.1:${port}`));
      console.log(chalk.dim(`  타겟:  ${baseUrl}`));
      console.log(chalk.dim(`  모델:  ${model || "(프로필 기본값)"}`));
      console.log(chalk.dim(`  레이트 리밋: ${rateLimit > 0 ? rateLimit + " 회/분" : "무제한 (0)"}`));
      if (opts.debug) {
        console.log(chalk.yellow(`  디버그: 켜짐 (요청/응답 로그 출력)`));
      }
      console.log();
      console.log(chalk.bold("Claude Code에서 사용:"));
      console.log(chalk.cyan(`  ANTHROPIC_BASE_URL=http://127.0.0.1:${port} claude`));
      console.log();
      console.log(chalk.dim("Ctrl+C로 중지"));

      // SIGINT 처리
      process.on("SIGINT", async () => {
        console.log(chalk.dim("\n프록시 중지 중..."));
        await server.stop();
        console.log(chalk.green("프록시 중지됨"));
        process.exit(0);
      });

      // 프로세스 유지
      await new Promise(() => {});
    } catch (err) {
      console.log(chalk.red(`오류: ${err.message}`));
    }
  });

if (process.argv.length === 2) {
  // TUI 시작 전: 이전 실행에서 프록시가 급작 종료되어 남은 설정 백업이 있으면 복원
  await ProxyServer.restoreFromDisk(manager);
  const app = React.createElement(App);
  const { waitUntilExit } = render(app);
  try {
    await waitUntilExit();
  } catch (err) {
    console.error(chalk.red(`TUI 오류: ${err.message}`));
    process.exit(1);
  }
} else {
  // CLI 명령 전에도 동일하게 복원 (proxy 명령 포함)
  await ProxyServer.restoreFromDisk(manager);
  program.parse();
}