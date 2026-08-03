import chalk from "chalk";

// chalk 헬퍼 (색상만 반환)
const c = (hex) => chalk.hex(hex);
const cBg = (hex) => chalk.bgHex(hex);

// 색상 이름 (React/Ink용 color prop)
export const colors = {
  brand: "#D97757",
  primary: "#5EEAD4",
  success: "#22C55E",
  warning: "#FACC15",
  danger: "#EF4444",
  info: "#60A5FA",
  muted: "gray",
  subtle: "#6B7280",
  yellow: "#FACC15",
  cyan: "#5EEAD4",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#60A5FA",
  bgGray: "gray",
};

// chalk 기반 렌더링 (이미 색이 적용된 문자열, Text 없이 사용 불가)
// → 권장: colors 객체를 사용하고 Text의 color prop으로 적용
export const theme = {
  brand: (s) => chalk.hex("#D97757").bold(s),
  primary: (s) => chalk.hex("#5EEAD4")(s),
  muted: (s) => chalk.gray(s),
  subtle: (s) => chalk.hex("#6B7280")(s),
  warning: (s) => chalk.hex("#FACC15")(s),
  danger: (s) => chalk.hex("#EF4444")(s),
  info: (s) => chalk.hex("#60A5FA")(s),
  success: (s) => chalk.hex("#22C55E")(s),
};

export function mask(value) {
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

export function providerName(provider) {
  return NAMES[provider] || provider;
}

export function detectProvider(envVars) {
  if (!envVars) return "anthropic";
  if (envVars.CLAUDE_CODE_USE_BEDROCK === "1") return "bedrock";
  if (envVars.CLAUDE_CODE_USE_VERTEX === "1") return "vertex";
  if (envVars.CLAUDE_CODE_USE_FOUNDRY === "1") return "foundry";
  if (envVars.ANTHROPIC_AWS_WORKSPACE_ID) return "aws";
  return "anthropic";
}