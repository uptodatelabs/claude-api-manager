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
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    return {
      profiles: data.profiles || {},
      activeProfile: data.activeProfile ?? null,
      settingsPath: data.settingsPath ?? null,
    };
  } catch {
    const backupPath = DATA_FILE + ".corrupt-" + Date.now();
    fs.copyFileSync(DATA_FILE, backupPath);
    const initial = { profiles: {}, activeProfile: null, settingsPath: null };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    console.error(`Warning: apis.json is corrupted. Backed up to ${backupPath}`);
    return initial;
  }
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
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + ".bak";
    fs.copyFileSync(settingsPath, backupPath);
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

function addProfile(name, envVars, model, fallbackModel, description = null, tags = null) {
  const data = readData();
  if (data.profiles[name]) {
    throw new Error(`Profile "${name}" already exists`);
  }
  data.profiles[name] = { env: envVars };
  if (model) data.profiles[name].model = model;
  if (fallbackModel) data.profiles[name].fallbackModel = fallbackModel;
  if (description) data.profiles[name].description = description;
  if (tags && tags.length > 0) data.profiles[name].tags = tags;
  writeData(data);
  return data.profiles[name];
}

function updateProfile(name, envVars, model, fallbackModel, description = null, tags = null) {
  const data = readData();
  if (!data.profiles[name]) {
    throw new Error(`Profile "${name}" not found`);
  }
  const existing = data.profiles[name];
  data.profiles[name] = { env: envVars };
  if (model) data.profiles[name].model = model;
  if (fallbackModel) data.profiles[name].fallbackModel = fallbackModel;
  // description/tags가 명시적으로 null로 전달되면 기존 값 유지
  if (description !== null) data.profiles[name].description = description;
  else if (existing.description) data.profiles[name].description = existing.description;
  if (tags !== null && tags.length > 0) data.profiles[name].tags = tags;
  else if (existing.tags && existing.tags.length > 0)
    data.profiles[name].tags = existing.tags;
  writeData(data);
  return data.profiles[name];
}

function renameProfile(oldName, newName) {
  const data = readData();
  if (!data.profiles[oldName]) {
    throw new Error(`Profile "${oldName}" not found`);
  }
  if (data.profiles[newName]) {
    throw new Error(`Profile "${newName}" already exists`);
  }
  data.profiles[newName] = data.profiles[oldName];
  delete data.profiles[oldName];
  if (data.activeProfile === oldName) {
    data.activeProfile = newName;
  }
  writeData(data);
  return data.profiles[newName];
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
  } else {
    delete settings.model;
  }
  if (profile.fallbackModel) {
    settings.fallbackModel = profile.fallbackModel;
  } else {
    delete settings.fallbackModel;
  }

  writeSettings(settings);

  data.activeProfile = name;
  data.profiles[name].lastApplied = new Date().toISOString();
  data.profiles[name].applyCount = (data.profiles[name].applyCount || 0) + 1;
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

function copyProfile(srcName, dstName) {
  const data = readData();
  if (!data.profiles[srcName]) {
    throw new Error(`Profile "${srcName}" not found`);
  }
  if (data.profiles[dstName]) {
    throw new Error(`Profile "${dstName}" already exists`);
  }
  data.profiles[dstName] = JSON.parse(JSON.stringify(data.profiles[srcName]));
  writeData(data);
  return data.profiles[dstName];
}

function captureProfile(name) {
  const data = readData();
  if (data.profiles[name]) {
    throw new Error(`Profile "${name}" already exists`);
  }

  const settings = readSettings();
  if (!settings) {
    throw new Error(`settings.json not found at ${getSettingsPath()}`);
  }

  const profile = {};
  if (settings.env) profile.env = { ...settings.env };
  if (settings.model) profile.model = settings.model;
  if (settings.fallbackModel) profile.fallbackModel = settings.fallbackModel;

  data.profiles[name] = profile;
  writeData(data);
  return profile;
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
  copyProfile,
  captureProfile,
  renameProfile,
};
