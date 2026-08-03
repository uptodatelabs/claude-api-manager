import chalk from "chalk";

export const theme = {
  brand: chalk.hex("#D97757").bold,
  brandDim: chalk.hex("#D97757"),
  primary: chalk.hex("#5EEAD4"),
  primaryDim: chalk.hex("#5EEAD4").dim,
  success: chalk.hex("#22C55E"),
  successDim: chalk.hex("#22C55E").dim,
  warning: chalk.hex("#FACC15"),
  danger: chalk.hex("#EF4444"),
  dangerDim: chalk.hex("#EF4444").dim,
  info: chalk.hex("#60A5FA"),
  muted: chalk.gray,
  subtle: chalk.hex("#6B7280"),
  highlight: chalk.bgHex("#D97757").hex("#1F2937").bold,
  selected: chalk.hex("#5EEAD4").bold,
  separator: chalk.hex("#374151"),
  border: chalk.hex("#4B5563"),
  borderActive: chalk.hex("#5EEAD4"),
  background: chalk.bgHex("#0F172A"),
  panelBg: chalk.bgHex("#1E293B"),
  yellow: chalk.hex("#FACC15"),
  cyan: chalk.hex("#5EEAD4"),
  gray: chalk.hex("#6B7280"),
  green: chalk.hex("#22C55E"),
  red: chalk.hex("#EF4444"),
  bold: chalk.bold,
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