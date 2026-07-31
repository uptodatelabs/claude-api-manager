const inquirer = require("inquirer");

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
        message: "ANTHROPIC_API_KEY (없으면 엔터):",
        default: existingEnv.ANTHROPIC_API_KEY || "",
      },
      {
        type: "input",
        name: "ANTHROPIC_AUTH_TOKEN",
        message: "ANTHROPIC_AUTH_TOKEN (Bearer 토큰, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_AUTH_TOKEN || "",
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
        message: "ANTHROPIC_BASE_URL (프록시/게이트웨이, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_BASE_URL || "",
      }
    );
  } else if (provider === "bedrock") {
    questions.push(
      {
        type: "input",
        name: "AWS_REGION",
        message: "AWS_REGION:",
        default: existingEnv.AWS_REGION || "us-east-1",
        validate: (v) => (v.trim() ? true : "AWS Region은 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_BEDROCK_BASE_URL",
        message: "ANTHROPIC_BEDROCK_BASE_URL (게이트웨이, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_BEDROCK_BASE_URL || "",
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
        message: "AWS_ACCESS_KEY_ID (자격증명 체인 사용 시 엔터):",
        default: existingEnv.AWS_ACCESS_KEY_ID || "",
      },
      {
        type: "input",
        name: "AWS_SECRET_ACCESS_KEY",
        message: "AWS_SECRET_ACCESS_KEY (자격증명 체인 사용 시 엔터):",
        default: existingEnv.AWS_SECRET_ACCESS_KEY || "",
      },
      {
        type: "input",
        name: "AWS_SESSION_TOKEN",
        message: "AWS_SESSION_TOKEN (없으면 엔터):",
        default: existingEnv.AWS_SESSION_TOKEN || "",
      }
    );
  } else if (provider === "vertex") {
    questions.push(
      {
        type: "input",
        name: "CLOUD_ML_REGION",
        message: "CLOUD_ML_REGION:",
        default: existingEnv.CLOUD_ML_REGION || "us-east5",
        validate: (v) => (v.trim() ? true : "Region은 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_VERTEX_PROJECT_ID",
        message: "ANTHROPIC_VERTEX_PROJECT_ID:",
        default: existingEnv.ANTHROPIC_VERTEX_PROJECT_ID || "",
        validate: (v) => (v.trim() ? true : "Project ID는 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_VERTEX_BASE_URL",
        message: "ANTHROPIC_VERTEX_BASE_URL (게이트웨이, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_VERTEX_BASE_URL || "",
      }
    );
  } else if (provider === "foundry") {
    questions.push(
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_RESOURCE",
        message: "ANTHROPIC_FOUNDRY_RESOURCE (URL 미설정 시 필수):",
        default: existingEnv.ANTHROPIC_FOUNDRY_RESOURCE || "",
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_BASE_URL",
        message: "ANTHROPIC_FOUNDRY_BASE_URL (없으면 엔터):",
        default: existingEnv.ANTHROPIC_FOUNDRY_BASE_URL || "",
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_API_KEY",
        message: "ANTHROPIC_FOUNDRY_API_KEY (없으면 엔터):",
        default: existingEnv.ANTHROPIC_FOUNDRY_API_KEY || "",
      },
      {
        type: "input",
        name: "ANTHROPIC_FOUNDRY_AUTH_TOKEN",
        message: "ANTHROPIC_FOUNDRY_AUTH_TOKEN (Bearer 토큰, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_FOUNDRY_AUTH_TOKEN || "",
      }
    );
  } else if (provider === "aws") {
    questions.push(
      {
        type: "input",
        name: "ANTHROPIC_AWS_WORKSPACE_ID",
        message: "ANTHROPIC_AWS_WORKSPACE_ID:",
        default: existingEnv.ANTHROPIC_AWS_WORKSPACE_ID || "",
        validate: (v) => (v.trim() ? true : "Workspace ID는 필수입니다"),
      },
      {
        type: "input",
        name: "ANTHROPIC_AWS_API_KEY",
        message: "ANTHROPIC_AWS_API_KEY (없으면 엔터):",
        default: existingEnv.ANTHROPIC_AWS_API_KEY || "",
      },
      {
        type: "input",
        name: "AWS_REGION",
        message: "AWS_REGION:",
        default: existingEnv.AWS_REGION || "us-east-1",
      },
      {
        type: "input",
        name: "ANTHROPIC_AWS_BASE_URL",
        message: "ANTHROPIC_AWS_BASE_URL (오버라이드, 없으면 엔터):",
        default: existingEnv.ANTHROPIC_AWS_BASE_URL || "",
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
      message:
        "ANTHROPIC_MODEL (예: opus, sonnet, claude-sonnet-4-5-20250514, 없으면 엔터):",
      default: existingEnv.ANTHROPIC_MODEL || "",
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_OPUS_MODEL",
      message: "ANTHROPIC_DEFAULT_OPUS_MODEL (opus alias 오버라이드, 없으면 엔터):",
      default: existingEnv.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_SONNET_MODEL",
      message:
        "ANTHROPIC_DEFAULT_SONNET_MODEL (sonnet alias 오버라이드, 없으면 엔터):",
      default: existingEnv.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
    },
    {
      type: "input",
      name: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      message:
        "ANTHROPIC_DEFAULT_HAIKU_MODEL (haiku alias 오버라이드, 없으면 엔터):",
      default: existingEnv.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
    },
    {
      type: "input",
      name: "model",
      message:
        "settings.json의 model 키 (예: opus, sonnet, 없으면 엔터):",
      default: existingModel,
    },
    {
      type: "input",
      name: "fallbackModel",
      message:
        "fallbackModel (쉼표 구분, 예: claude-sonnet-5,claude-haiku-4-5, 없으면 엔터):",
      default: existingFallback,
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

  return { envVars, model, fallbackModel: fallbackModel && fallbackModel.length ? fallbackModel : null };
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
