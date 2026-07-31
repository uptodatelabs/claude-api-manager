const fs = require("fs");
const path = require("path");
const os = require("os");

const DATA_DIR = path.join(os.homedir(), ".claude-api-manager");
const DATA_FILE = path.join(DATA_DIR, "apis.json");

function getDefaultSettingsPath() {
  if (process.platform === "win32") {
    return path.join(os.homedir(), ".claude", "settings.json");
  }
  return path.join(os.homedir(), ".claude", "settings.json");
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readData() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { profiles: {}, activeProfile: null, settingsPath: null };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getSettingsPath() {
  const data = readData();
  return data.settingsPath || getDefaultSettingsPath();
}

function setSettingsPath(newPath) {
  const data = readData();
  data.settingsPath = newPath;
  writeData(data);
}

function readSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return null;
  }
}

function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

function listProfiles() {
  const data = readData();
  return Object.entries(data.profiles).map(([name, profile]) => ({
    name,
    ...profile,
    isActive: name === data.activeProfile,
  }));
}

function getProfile(name) {
  const data = readData();
  return data.profiles[name] || null;
}

function addProfile(name, envVars, model, fallbackModel) {
  const data = readData();
  if (data.profiles[name]) {
    throw new Error(`Profile "${name}" already exists`);
  }
  data.profiles[name] = { env: envVars };
  if (model) data.profiles[name].model = model;
  if (fallbackModel) data.profiles[name].fallbackModel = fallbackModel;
  writeData(data);
  return data.profiles[name];
}

function updateProfile(name, envVars, model, fallbackModel) {
  const data = readData();
  if (!data.profiles[name]) {
    throw new Error(`Profile "${name}" not found`);
  }
  data.profiles[name] = { env: envVars };
  if (model) data.profiles[name].model = model;
  if (fallbackModel) data.profiles[name].fallbackModel = fallbackModel;
  writeData(data);
  return data.profiles[name];
}

function removeProfile(name) {
  const data = readData();
  if (!data.profiles[name]) {
    throw new Error(`Profile "${name}" not found`);
  }
  delete data.profiles[name];
  if (data.activeProfile === name) {
    data.activeProfile = null;
  }
  writeData(data);
}

function applyProfile(name) {
  const data = readData();
  const profile = data.profiles[name];
  if (!profile) {
    throw new Error(`Profile "${name}" not found`);
  }

  let settings = readSettings();
  if (!settings) {
    settings = {};
  }

  settings.env = { ...profile.env };

  if (profile.model) {
    settings.model = profile.model;
  }
  if (profile.fallbackModel) {
    settings.fallbackModel = profile.fallbackModel;
  }

  writeSettings(settings);

  data.activeProfile = name;
  writeData(data);

  return settings;
}

function getActiveProfileName() {
  const data = readData();
  return data.activeProfile;
}

function getDataPath() {
  return DATA_FILE;
}

function exportProfiles(filePath) {
  const data = readData();
  const exportData = {
    profiles: data.profiles,
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
  const resolvedPath = path.resolve(filePath);
  fs.writeFileSync(resolvedPath, JSON.stringify(exportData, null, 2), "utf-8");
  return resolvedPath;
}

function importProfiles(filePath, overwrite = false) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  let importData;
  try {
    importData = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  } catch {
    throw new Error(`Invalid JSON file: ${resolvedPath}`);
  }

  if (!importData.profiles || typeof importData.profiles !== "object") {
    throw new Error("Invalid format: 'profiles' object not found");
  }

  const data = readData();
  const imported = [];
  const skipped = [];

  for (const [name, profile] of Object.entries(importData.profiles)) {
    if (data.profiles[name] && !overwrite) {
      skipped.push(name);
      continue;
    }
    data.profiles[name] = profile;
    imported.push(name);
  }

  writeData(data);
  return { imported, skipped };
}

module.exports = {
  readData,
  writeData,
  getSettingsPath,
  setSettingsPath,
  readSettings,
  writeSettings,
  listProfiles,
  getProfile,
  addProfile,
  updateProfile,
  removeProfile,
  applyProfile,
  getActiveProfileName,
  getDefaultSettingsPath,
  getDataPath,
  exportProfiles,
  importProfiles,
};
