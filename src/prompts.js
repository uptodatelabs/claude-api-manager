const inquirer = require("inquirer");
const chalk = require("chalk");

function hintDelete(isEdit, defaultVal) {
  if (isEdit && defaultVal) return " (지우면 삭제)";
  return "";
}

function deleteTransformer(value, isEdit) {
  if (isEdit && value === "") return chalk.red("(삭제)");
  return value;
}

const PROVIDERS = [
  { name: "Anthropic API (기본)", value: "anthropic" },
  { name: "Amazon Bedrock", value: "bedrock" },
  { name: "Google Cloud Agent Platform (구 Vertex AI)", value: "vertex" },
  { name: "Microsoft Foundry", value: "foundry" },
  { name: "Claude Platform on AWS", value: "aws" },
];

async function promptForProfile(existingProfile) {
  const existingEnv = existingProfile ? existingProfile.env : {};
  const existingModel = existingProfile ? existingProfile.model : "";
  const existingFallback = existingProfile
    ? Array.isArray(existingProfile.fallbackModel)
      ? existingProfile.fallbackModel.join(", ")
      : existingProfile.fallbackModel || ""
    : "";
  const isEdit = !!existingProfile;

  if (isEdit) {
    console.log(chalk.dim("\n  값을 삭제하려면 모두 지우고 Enter를 누르세요.\n"));
  }

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "API 공급자를 선택하세요:",
      choices: PROVIDERS,
      default: detectProvider(existingEnv),
    },
  ]);

  const envVars = {};
  const questions = [];

  if (provider === "anthropic") {
    let apiKeyValue = existingEnv.ANTHROPIC_API_KEY || "";
    questions.push(
      {
        type: "input",
        name: "ANTHROPIC_API_KEY",
        message: `ANTHROPIC_API_KEY${hintDelete(isEdit, existingEnv.ANTHROPIC_API_KEY)} (없으면 엔터):`,
        default: existingEnv.ANTHROPIC_API_KEY || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "ANTHROPIC_AUTH_TOKEN",
        message: `ANTHROPIC_AUTH_TOKEN${hintDelete(isEdit, existingEnv.ANTHROPIC_AUTH_TOKEN)} (Bearer 토큰, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_AUTH_TOKEN || "",
        transformer: (v) => deleteTransformer(v, isEdit),
        validate: (v, answers) => {
          if (!v.trim() && !answers.ANTHROPIC_API_KEY && !apiKeyValue) {
            return "ANTHROPIC_API_KEY 또는 ANTHROPIC_AUTH_TOKEN 중至少 하나는 필수입니다";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "ANTHROPIC_BASE_URL",
        message: `ANTHROPIC_BASE_URL${hintDelete(isEdit, existingEnv.ANTHROPIC_BASE_URL)} (프록시/게이트웨이, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_BASE_URL || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      }
    );
  } else if (provider === "bedrock") {
    questions.push(
      {
        type: "input",
        name: "AWS_REGION",
        message: `AWS_REGION${hintDelete(isEdit, existingEnv.AWS_REGION)}:`,
        default: existingEnv.AWS_REGION || "us-east-1",
        transformer: (v) => deleteTransformer(v, isEdit),
        validate: (v) => (v.trim() ? true : "AWS Region은 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_BEDROCK_BASE_URL",
        message: `ANTHROPIC_BEDROCK_BASE_URL${hintDelete(isEdit, existingEnv.ANTHROPIC_BEDROCK_BASE_URL)} (게이트웨이, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_BEDROCK_BASE_URL || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "list",
        name: "ANTHROPIC_BEDROCK_SERVICE_TIER",
        message: "서비스 티어:",
        choices: [
          { name: "default", value: "" },
          { name: "flex", value: "flex" },
          { name: "priority", value: "priority" },
        ],
        default: existingEnv.ANTHROPIC_BEDROCK_SERVICE_TIER || "",
      },
      {
        type: "input",
        name: "AWS_ACCESS_KEY_ID",
        message: `AWS_ACCESS_KEY_ID${hintDelete(isEdit, existingEnv.AWS_ACCESS_KEY_ID)} (자격증명 체인 사용 시 엔터):`,
        default: existingEnv.AWS_ACCESS_KEY_ID || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "AWS_SECRET_ACCESS_KEY",
        message: `AWS_SECRET_ACCESS_KEY${hintDelete(isEdit, existingEnv.AWS_SECRET_ACCESS_KEY)} (자격증명 체인 사용 시 엔터):`,
        default: existingEnv.AWS_SECRET_ACCESS_KEY || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "AWS_SESSION_TOKEN",
        message: `AWS_SESSION_TOKEN${hintDelete(isEdit, existingEnv.AWS_SESSION_TOKEN)} (없으면 엔터):`,
        default: existingEnv.AWS_SESSION_TOKEN || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      }
    );
  } else if (provider === "vertex") {
    questions.push(
      {
        type: "input",
        name: "CLOUD_ML_REGION",
        message: `CLOUD_ML_REGION${hintDelete(isEdit, existingEnv.CLOUD_ML_REGION)}:`,
        default: existingEnv.CLOUD_ML_REGION || "us-east5",
        transformer: (v) => deleteTransformer(v, isEdit),
        validate: (v) => (v.trim() ? true : "Region은 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_VERTEX_PROJECT_ID",
        message: `ANTHROPIC_VERTEX_PROJECT_ID${hintDelete(isEdit, existingEnv.ANTHROPIC_VERTEX_PROJECT_ID)}:`,
        default: existingEnv.ANTHROPIC_VERTEX_PROJECT_ID || "",
        transformer: (v) => deleteTransformer(v, isEdit),
        validate: (v) => (v.trim() ? true : "Project ID는 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_VERTEX_BASE_URL",
        message: `ANTHROPIC_VERTEX_BASE_URL${hintDelete(isEdit, existingEnv.ANTHROPIC_VERTEX_BASE_URL)} (게이트웨이, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_VERTEX_BASE_URL || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      }
    );
  } else if (provider === "foundry") {
    questions.push(
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_RESOURCE",
        message: `ANTHROPIC_FOUNDRY_RESOURCE${hintDelete(isEdit, existingEnv.ANTHROPIC_FOUNDRY_RESOURCE)} (URL 미설정 시 필수):`,
        default: existingEnv.ANTHROPIC_FOUNDRY_RESOURCE || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_BASE_URL",
        message: `ANTHROPIC_FOUNDRY_BASE_URL${hintDelete(isEdit, existingEnv.ANTHROPIC_FOUNDRY_BASE_URL)} (없으면 엔터):`,
        default: existingEnv.ANTHROPIC_FOUNDRY_BASE_URL || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_API_KEY",
        message: `ANTHROPIC_FOUNDRY_API_KEY${hintDelete(isEdit, existingEnv.ANTHROPIC_FOUNDRY_API_KEY)} (없으면 엔터):`,
        default: existingEnv.ANTHROPIC_FOUNDRY_API_KEY || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
        message: `ANTHROPIC_FOUNDRY_AUTH_TOKEN${hintDelete(isEdit, existingEnv.ANTHROPIC_FOUNDRY_AUTH_TOKEN)} (Bearer 토큰, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_FOUNDRY_AUTH_TOKEN || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      }
    );
  } else if (provider === "aws") {
    questions.push(
      {
        type: "input",
        name: "ANTHROPIC_AWS_WORKSPACE_ID",
        message: `ANTHROPIC_AWS_WORKSPACE_ID${hintDelete(isEdit, existingEnv.ANTHROPIC_AWS_WORKSPACE_ID)}:`,
        default: existingEnv.ANTHROPIC_AWS_WORKSPACE_ID || "",
        transformer: (v) => deleteTransformer(v, isEdit),
        validate: (v) => (v.trim() ? true : "Workspace ID는 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_AWS_API_KEY",
        message: `ANTHROPIC_AWS_API_KEY${hintDelete(isEdit, existingEnv.ANTHROPIC_AWS_API_KEY)} (없으면 엔터):`,
        default: existingEnv.ANTHROPIC_AWS_API_KEY || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "AWS_REGION",
        message: `AWS_REGION${hintDelete(isEdit, existingEnv.AWS_REGION)}:`,
        default: existingEnv.AWS_REGION || "us-east-1",
        transformer: (v) => deleteTransformer(v, isEdit),
      },
      {
        type: "input",
        name: "ANTHROPIC_AWS_BASE_URL",
        message: `ANTHROPIC_AWS_BASE_URL${hintDelete(isEdit, existingEnv.ANTHROPIC_AWS_BASE_URL)} (오버라이드, 없으면 엔터):`,
        default: existingEnv.ANTHROPIC_AWS_BASE_URL || "",
        transformer: (v) => deleteTransformer(v, isEdit),
      }
    );
  }

  const providerAnswers = await inquirer.prompt(questions);

  for (const [key, value] of Object.entries(providerAnswers)) {
    if (value && value.trim()) {
      envVars[key] = value.trim();
    }
  }

  if (provider === "bedrock") {
    envVars.CLAUDE_CODE_USE_BEDROCK = "1";
  } else if (provider === "vertex") {
    envVars.CLAUDE_CODE_USE_VERTEX = "1";
  } else if (provider === "foundry") {
    envVars.CLAUDE_CODE_USE_FOUNDRY = "1";
  }

  const modelQuestions = [
    {
      type: "input",
      name: "ANTHROPIC_MODEL",
      message: `ANTHROPIC_MODEL${hintDelete(isEdit, existingEnv.ANTHROPIC_MODEL)} (예: opus, sonnet, 없으면 엔터):`,
      default: existingEnv.ANTHROPIC_MODEL || "",
      transformer: (v) => deleteTransformer(v, isEdit),
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_OPUS_MODEL",
      message: `ANTHROPIC_DEFAULT_OPUS_MODEL${hintDelete(isEdit, existingEnv.ANTHROPIC_DEFAULT_OPUS_MODEL)} (opus alias 오버라이드, 없으면 엔터):`,
      default: existingEnv.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
      transformer: (v) => deleteTransformer(v, isEdit),
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_SONNET_MODEL",
      message: `ANTHROPIC_DEFAULT_SONNET_MODEL${hintDelete(isEdit, existingEnv.ANTHROPIC_DEFAULT_SONNET_MODEL)} (sonnet alias 오버라이드, 없으면 엔터):`,
      default: existingEnv.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
      transformer: (v) => deleteTransformer(v, isEdit),
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      message: `ANTHROPIC_DEFAULT_HAIKU_MODEL${hintDelete(isEdit, existingEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL)} (haiku alias 오버라이드, 없으면 엔터):`,
      default: existingEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
      transformer: (v) => deleteTransformer(v, isEdit),
    },
    {
      type: "input",
      name: "model",
      message: `settings.json의 model 키${hintDelete(isEdit, existingModel)} (예: opus, sonnet, 없으면 엔터):`,
      default: existingModel,
      transformer: (v) => deleteTransformer(v, isEdit),
    },
    {
      type: "input",
      name: "fallbackModel",
      message: `fallbackModel${hintDelete(isEdit, existingFallback)} (쉼표 구분, 없으면 엔터):`,
      default: existingFallback,
      transformer: (v) => deleteTransformer(v, isEdit),
    },
  ];

  const modelAnswers = await inquirer.prompt(modelQuestions);

  for (const [key, value] of Object.entries(modelAnswers)) {
    if (
      key !== "model" &&
      key !== "fallbackModel" &&
      value &&
      value.trim()
    ) {
      envVars[key] = value.trim();
    }
  }

  const model = modelAnswers.model ? modelAnswers.model.trim() : null;
  const fallbackModel = modelAnswers.fallbackModel
    ? modelAnswers.fallbackModel
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  // 커스텀 env 반복 입력
  const existingCustomKeys = Object.keys(envVars).filter(
    (key) => !isKnownEnvKey(key)
  );
  if (existingCustomKeys.length > 0) {
    console.log("  기존 커스텀 env:");
    for (const key of existingCustomKeys) {
      console.log(`    ${key}=${envVars[key]}`);
    }
  }

  const { addCustomEnv } = await inquirer.prompt([
    {
      type: "confirm",
      name: "addCustomEnv",
      message: "추가할 커스텀 환경변수가 있습니까? (예: API_TIMEOUT_MS)",
      default: existingCustomKeys.length > 0,
    },
  ]);

  if (addCustomEnv) {
    let addingMore = true;
    while (addingMore) {
      const { customKey, customValue, more } = await inquirer.prompt([
        {
          type: "input",
          name: "customKey",
          message: "환경변수 이름 (예: API_TIMEOUT_MS):",
          validate: (v) => (v.trim() ? true : "이름은 필수입니다"),
        },
        {
          type: "input",
          name: "customValue",
          message: "값:",
          validate: (v) => (v.trim() ? true : "값은 필수입니다"),
        },
        {
          type: "confirm",
          name: "more",
          message: "더 추가하시겠습니까?",
          default: false,
        },
      ]);
      envVars[customKey.trim()] = customValue.trim();
      addingMore = more;
    }
  }

  return { envVars, model, fallbackModel: fallbackModel && fallbackModel.length ? fallbackModel : null };
}

const KNOWN_ENV_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "CLAUDE_CODE_USE_BEDROCK",
  "AWS_REGION",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "ANTHROPIC_BEDROCK_SERVICE_TIER",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "CLAUDE_CODE_USE_VERTEX",
  "CLOUD_ML_REGION",
  "ANTHROPIC_VERTEX_PROJECT_ID",
  "ANTHROPIC_VERTEX_BASE_URL",
  "CLAUDE_CODE_USE_FOUNDRY",
  "ANTHROPIC_FOUNDRY_RESOURCE",
  "ANTHROPIC_FOUNDRY_BASE_URL",
  "ANTHROPIC_FOUNDRY_API_KEY",
  "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
  "ANTHROPIC_AWS_WORKSPACE_ID",
  "ANTHROPIC_AWS_API_KEY",
  "ANTHROPIC_AWS_BASE_URL",
]);

function isKnownEnvKey(key) {
  return KNOWN_ENV_KEYS.has(key);
}

function detectProvider(envVars) {
  if (envVars.CLAUDE_CODE_USE_BEDROCK === "1") return "bedrock";
  if (envVars.CLAUDE_CODE_USE_VERTEX === "1") return "vertex";
  if (envVars.CLAUDE_CODE_USE_FOUNDRY === "1") return "foundry";
  if (envVars.ANTHROPIC_AWS_WORKSPACE_ID) return "aws";
  return "anthropic";
}

module.exports = {
  promptForProfile,
  detectProvider,
  PROVIDERS,
};
