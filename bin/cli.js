#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const inquirer = require("inquirer");
const manager = require("../src/manager");
const { promptForProfile, detectProvider, PROVIDERS } = require("../src/prompts");

function maskSensitive(value) {
  if (!value) return "";
  return value.length > 8 ? value.slice(0, 4) + "..." + value.slice(-4) : "****";
}

function getProfileSummary(profile) {
  const provider = detectProvider(profile.env);
  const providerLabel = PROVIDERS.find((pr) => pr.value === provider)?.name || provider;
  const parts = [providerLabel];

  if (profile.env.ANTHROPIC_API_KEY) parts.push(`Key: ${maskSensitive(profile.env.ANTHROPIC_API_KEY)}`);
  if (profile.env.ANTHROPIC_AUTH_TOKEN) parts.push(`Token: ${maskSensitive(profile.env.ANTHROPIC_AUTH_TOKEN)}`);
  if (profile.env.ANTHROPIC_BASE_URL) parts.push(`URL: ${profile.env.ANTHROPIC_BASE_URL}`);
  if (profile.model) parts.push(`Model: ${profile.model}`);

  return parts.join(" | ");
}

function printProfileDetail(profile) {
  console.log(chalk.bold("env:"));
  const env = profile.env || {};
  if (Object.keys(env).length === 0) {
    console.log(chalk.dim("  (없음)"));
  } else {
    for (const [key, value] of Object.entries(env)) {
      if (key.includes("KEY") || key.includes("SECRET") || key.includes("TOKEN")) {
        console.log(chalk.dim(`  ${key}=${maskSensitive(value)}`));
      } else {
        console.log(chalk.dim(`  ${key}=${value}`));
      }
    }
  }
  if (profile.model) {
    console.log(chalk.bold("\nmodel:") + ` ${profile.model}`);
  }
  if (profile.fallbackModel) {
    console.log(
      chalk.bold("fallbackModel:") +
        ` ${Array.isArray(profile.fallbackModel) ? profile.fallbackModel.join(", ") : profile.fallbackModel}`
    );
  }
}

async function offerApply(name) {
  const { doApply } = await inquirer.prompt([
    {
      type: "confirm",
      name: "doApply",
      message: `settings.json에 "${name}" 프로필을 지금 적용할까요?`,
      default: true,
    },
  ]);
  if (doApply) {
    try {
      const settings = manager.applyProfile(name);
      printApplyResult(name, settings);
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  }
}

function printApplyResult(name, settings) {
  console.log(chalk.green(`\n프로필 "${name}"이(가) 적용되었습니다.`));
  console.log(chalk.dim(`  settings.json: ${manager.getSettingsPath()}\n`));

  console.log(chalk.bold("적용된 env:"));
  for (const [key, value] of Object.entries(settings.env)) {
    if (key.includes("KEY") || key.includes("SECRET") || key.includes("TOKEN")) {
      console.log(chalk.dim(`  ${key}=${maskSensitive(value)}`));
    } else {
      console.log(chalk.dim(`  ${key}=${value}`));
    }
  }
  if (settings.model) {
    console.log(chalk.bold("\n적용된 model:") + ` ${settings.model}`);
  }
  if (settings.fallbackModel) {
    console.log(
      chalk.bold("적용된 fallbackModel:") +
        ` ${Array.isArray(settings.fallbackModel) ? settings.fallbackModel.join(", ") : settings.fallbackModel}`
    );
  }
  console.log();
}

async function showDashboard() {
  console.log(chalk.bold("\n  Claude API Manager Dashboard\n"));
  console.log(chalk.dim("  팁: 프롬프트에서 글자를 입력하면 필터링됩니다.\n"));

  let running = true;
  while (running) {
    const profiles = manager.listProfiles();
    const currentActive = manager.getActiveProfileName();

    const choices = profiles.map((p) => {
      const isActive = p.name === currentActive;
      const marker = isActive ? chalk.green(" ●") : chalk.dim(" ○");
      const summary = getProfileSummary(p);
      const tags = p.tags && p.tags.length > 0 ? chalk.yellow(` [${p.tags.join(",")}]`) : "";
      const desc = p.description ? chalk.dim(` - ${p.description}`) : "";
      return {
        name: `${marker} ${chalk.cyan(p.name)}${tags}${desc}  ${chalk.dim(summary)}`,
        value: p.name,
        short: p.name,
      };
    });

    choices.push(new inquirer.Separator());
    choices.push({ name: chalk.dim("  종료"), value: "__exit__" });

    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message: "프로필을 선택하세요 (입력으로 필터링):",
        choices,
        pageSize: 15,
      },
    ]);

    if (selected === "__exit__") {
      running = false;
    } else {
      await handleProfileAction(selected);
    }
  }
}

async function handleProfileAction(selected) {
  let actionDone = false;
  while (!actionDone) {
    const profile = manager.getProfile(selected);
    const isActive = selected === manager.getActiveProfileName();
    const marker = isActive ? chalk.green(" (active)") : "";

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: `${chalk.cyan(selected)}${marker} - 실행할 작업:`,
            choices: [
              { name: "  적용 (apply)", value: "apply" },
              { name: "  상세 보기 (show)", value: "show" },
              { name: "  수정 (edit)", value: "edit" },
              { name: "  복제 (copy)", value: "copy" },
              { name: "  삭제 (remove)", value: "remove" },
              new inquirer.Separator(),
              { name: chalk.dim("  뒤로"), value: "__back__" },
            ],
      },
    ]);

    if (action === "__back__") {
      actionDone = true;
    } else if (action === "apply") {
      try {
        const settings = manager.applyProfile(selected);
        printApplyResult(selected, settings);
      } catch (err) {
        console.error(chalk.red(`오류: ${err.message}`));
      }
      actionDone = true;
    } else if (action === "show") {
      const activeName = manager.getActiveProfileName();
      const m = selected === activeName ? chalk.green(" (active)") : "";
      console.log(chalk.bold(`\n프로필: ${chalk.cyan(selected)}${m}\n`));
      printProfileDetail(profile);
      console.log();
    } else if (action === "edit") {
      try {
        console.log(chalk.bold(`\n프로필 "${selected}" 수정:\n`));
        const { envVars, model, fallbackModel } = await promptForProfile(profile);
        manager.updateProfile(selected, envVars, model, fallbackModel);
        console.log(chalk.green(`\n프로필 "${selected}"이(가) 수정되었습니다.\n`));
        await offerApply(selected);
      } catch (err) {
        console.error(chalk.red(`오류: ${err.message}`));
      }
      actionDone = true;
    } else if (action === "copy") {
      const { dstName } = await inquirer.prompt([
        {
          type: "input",
          name: "dstName",
          message: "새 프로필 이름:",
          validate: (v) => (v.trim() ? true : "이름은 필수입니다"),
        },
      ]);
      try {
        manager.copyProfile(selected, dstName.trim());
        console.log(chalk.green(`"${selected}" → "${dstName.trim()}" 복제되었습니다.`));
      } catch (err) {
        console.error(chalk.red(`오류: ${err.message}`));
      }
    } else if (action === "remove") {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `프로필 "${selected}"을(를) 정말 삭제할까요?`,
          default: false,
        },
      ]);
      if (confirm) {
        try {
          manager.removeProfile(selected);
          console.log(chalk.green(`"${selected}"이(가) 삭제되었습니다.`));
          actionDone = true;
        } catch (err) {
          console.error(chalk.red(`오류: ${err.message}`));
        }
      }
    }
  }
}

const program = new Command();

program
  .name("cam")
  .description("Claude API Manager - Claude Code settings.json의 API 설정을 관리합니다")
  .version("1.0.0")
  .action(() => showDashboard());

program
  .command("list")
  .alias("ls")
  .description("저장된 API 프로필 목록 표시")
  .action(() => {
    const profiles = manager.listProfiles();
    const activeName = manager.getActiveProfileName();

    if (profiles.length === 0) {
      console.log(chalk.yellow("저장된 프로필이 없습니다."));
      console.log(chalk.dim("  cam add <name> 으로 새 프로필을 추가하세요."));
      return;
    }

    console.log(chalk.bold("\n저장된 API 프로필:\n"));
    for (const p of profiles) {
      const marker = p.isActive ? chalk.green(" (active)") : "";
      const provider = detectProvider(p.env);
      const providerLabel = PROVIDERS.find((pr) => pr.value === provider)?.name || provider;
      console.log(`  ${chalk.cyan(p.name)}${marker}`);
      console.log(chalk.dim(`    공급자: ${providerLabel}`));
      if (p.env.ANTHROPIC_API_KEY) {
        const key = p.env.ANTHROPIC_API_KEY;
        const masked = key.length > 8 ? key.slice(0, 4) + "..." + key.slice(-4) : "****";
        console.log(chalk.dim(`    API Key: ${masked}`));
      }
      if (p.env.ANTHROPIC_AUTH_TOKEN) {
        const token = p.env.ANTHROPIC_AUTH_TOKEN;
        const masked = token.length > 8 ? token.slice(0, 4) + "..." + token.slice(-4) : "****";
        console.log(chalk.dim(`    Auth Token: ${masked}`));
      }
      if (p.env.ANTHROPIC_BASE_URL) {
        console.log(chalk.dim(`    Base URL: ${p.env.ANTHROPIC_BASE_URL}`));
      }
      if (p.model) {
        console.log(chalk.dim(`    Model: ${p.model}`));
      }
      console.log();
    }
  });

program
  .command("select")
  .alias("s")
  .description("대시보드에서 프로필 선택 및 작업 실행")
  .action(() => showDashboard());

program
  .command("show <name>")
  .description("프로필 상세 정보 표시")
  .action((name) => {
    const profile = manager.getProfile(name);
    if (!profile) {
      console.log(chalk.red(`프로필 "${name}"을(를) 찾을 수 없습니다.`));
      return;
    }
    const activeName = manager.getActiveProfileName();
    const marker = name === activeName ? chalk.green(" (active)") : "";
    console.log(chalk.bold(`\n프로필: ${chalk.cyan(name)}${marker}\n`));
    printProfileDetail(profile);
    console.log();
  });

program
  .command("capture <name>")
  .description("현재 settings.json을 새 프로필로 저장")
  .action((name) => {
    try {
      const profile = manager.captureProfile(name);
      console.log(chalk.green(`\n프로필 "${name}"이(가) 저장되었습니다.`));
      console.log(chalk.dim(`  settings.json: ${manager.getSettingsPath()}\n`));
      printProfileDetail(profile);
      console.log();
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("copy <srcName> <dstName>")
  .description("프로필 복제")
  .action((srcName, dstName) => {
    try {
      manager.copyProfile(srcName, dstName);
      console.log(chalk.green(`프로필 "${srcName}" → "${dstName}" 복제되었습니다.`));
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("add <name>")
  .description("새 API 프로필 추가")
  .action(async (name) => {
    try {
      const existing = manager.getProfile(name);
      if (existing) {
        console.log(chalk.red(`프로필 "${name}"이(가) 이미 존재합니다.`));
        console.log(chalk.dim("  cam edit <name> 으로 수정하세요."));
        return;
      }

      console.log(chalk.bold(`\n새 프로필 "${name}" 설정:\n`));
      const { envVars, model, fallbackModel } = await promptForProfile();
      manager.addProfile(name, envVars, model, fallbackModel);
      console.log(chalk.green(`\n프로필 "${name}"이(가) 저장되었습니다.\n`));
      await offerApply(name);
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("edit <name>")
  .description("기존 API 프로필 수정")
  .action(async (name) => {
    try {
      const existing = manager.getProfile(name);
      if (!existing) {
        console.log(chalk.red(`프로필 "${name}"을(를) 찾을 수 없습니다.`));
        return;
      }

      console.log(chalk.bold(`\n프로필 "${name}" 수정:\n`));
      const { envVars, model, fallbackModel } = await promptForProfile(existing);
      manager.updateProfile(name, envVars, model, fallbackModel);
      console.log(chalk.green(`\n프로필 "${name}"이(가) 수정되었습니다.\n`));
      await offerApply(name);
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("API 프로필 삭제")
  .action(async (name) => {
    try {
      const profile = manager.getProfile(name);
      if (!profile) {
        console.log(chalk.red(`프로필 "${name}"을(를) 찾을 수 없습니다.`));
        return;
      }
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `프로필 "${name}"을(를) 정말 삭제할까요?`,
          default: false,
        },
      ]);
      if (!confirm) {
        console.log(chalk.dim("취소되었습니다."));
        return;
      }
      manager.removeProfile(name);
      console.log(chalk.green(`프로필 "${name}"이(가) 삭제되었습니다.`));
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("apply <name>")
  .description("settings.json에 프로필 적용 (env 섹션만 교체)")
  .action((name) => {
    try {
      const settings = manager.applyProfile(name);
      printApplyResult(name, settings);
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("current")
  .description("현재 활성 프로필과 settings.json env 표시")
  .action(() => {
    const activeName = manager.getActiveProfileName();
    if (!activeName) {
      console.log(chalk.yellow("활성 프로필이 없습니다."));
      console.log(chalk.dim("  cam apply <name> 으로 프로필을 적용하세요."));
      return;
    }

    const profile = manager.getProfile(activeName);
    console.log(chalk.bold(`\n활성 프로필: ${chalk.cyan(activeName)}\n`));

    console.log(chalk.bold("env:"));
    for (const [key, value] of Object.entries(profile.env)) {
      if (key.includes("KEY") || key.includes("SECRET") || key.includes("TOKEN")) {
        const masked = value.length > 8 ? value.slice(0, 4) + "..." + value.slice(-4) : "****";
        console.log(chalk.dim(`  ${key}=${masked}`));
      } else {
        console.log(chalk.dim(`  ${key}=${value}`));
      }
    }
    if (profile.model) {
      console.log(chalk.bold("\nmodel:") + ` ${profile.model}`);
    }
    if (profile.fallbackModel) {
      console.log(
        chalk.bold("fallbackModel:") +
          ` ${Array.isArray(profile.fallbackModel) ? profile.fallbackModel.join(", ") : profile.fallbackModel}`
      );
    }

    console.log(chalk.dim(`\nsettings.json: ${manager.getSettingsPath()}\n`));
  });

program
  .command("path")
  .description("settings.json 경로 확인 또는 변경")
  .option("-s, --set <path>", "settings.json 경로 변경")
  .action((opts) => {
    if (opts.set) {
      manager.setSettingsPath(opts.set);
      console.log(chalk.green(`settings.json 경로가 변경되었습니다:`));
      console.log(chalk.dim(`  ${opts.set}`));
    } else {
      const currentPath = manager.getSettingsPath();
      const defaultPath = manager.getDefaultSettingsPath();
      console.log(chalk.bold("\nsettings.json 경로:"));
      console.log(`  ${currentPath}`);
      if (currentPath !== defaultPath) {
        console.log(chalk.dim(`  (기본값: ${defaultPath})`));
      }
      console.log(chalk.dim("\n  cam path -s <path> 로 변경할 수 있습니다.\n"));
    }
  });

program
  .command("export <file>")
  .description("모든 프로필을 JSON 파일로 내보내기")
  .action((file) => {
    try {
      const exportedPath = manager.exportProfiles(file);
      const profiles = manager.listProfiles();
      console.log(chalk.green(`\n${profiles.length}개 프로필을 내보냈습니다.`));
      console.log(chalk.dim(`  ${exportedPath}\n`));
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("import <file>")
  .description("JSON 파일에서 프로필 가져오기")
  .option("-f, --force", "기존 프로필 덮어쓰기")
  .action((file, opts) => {
    try {
      const { imported, skipped } = manager.importProfiles(file, opts.force);
      console.log(chalk.green(`\n${imported.length}개 프로필을 가져왔습니다.`));
      for (const name of imported) {
        console.log(chalk.dim(`  + ${name}`));
      }
      if (skipped.length > 0) {
        console.log(chalk.yellow(`\n${skipped.length}개 프로필 건너뜀 (이미 존재):`));
        for (const name of skipped) {
          console.log(chalk.dim(`  - ${name}`));
        }
        console.log(chalk.dim("\n  --force 옵션으로 덮어쓸 수 있습니다."));
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`오류: ${err.message}`));
    }
  });

program
  .command("config")
  .description("설정 파일 경로 표시")
  .action(() => {
    console.log(chalk.bold("\n설정 파일:"));
    console.log(`  ${manager.getDataPath()}`);
    console.log(chalk.dim("\n  이 파일을 백업하거나 다른 기기에 복사하면 프로필을 이전할 수 있습니다."));
    console.log(chalk.dim("  cam export <file> / cam import <file> 으로 내보내기/가져오기 가능\n"));
  });

program.parse();
