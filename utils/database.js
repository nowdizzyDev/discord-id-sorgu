const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "dbs", "data.json");
const LIMITS_PATH = path.join(__dirname, "..", "dbs", "limits.json");
const PACKAGES_PATH = path.join(__dirname, "..", "dbs", "packages.json");
const USER_PACKAGES_PATH = path.join(__dirname, "..", "dbs", "user_packages.json");

function readDatabase() {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch (error) {
    console.error("Veritabanı okuma hatası:", error);
    return [];
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Veritabanı yazma hatası:", error);
  }
}

function readLimits() {
  try {
    if (!fs.existsSync(LIMITS_PATH)) return [];
    return JSON.parse(fs.readFileSync(LIMITS_PATH, "utf8"));
  } catch (error) {
    console.error("Limit kayıtları okuma hatası:", error);
    return [];
  }
}

function writeLimits(data) {
  try {
    fs.writeFileSync(LIMITS_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Limit kayıtları yazma hatası:", error);
  }
}

function findUserByDiscordId(discordId) {
  const database = readDatabase();
  return database.find(user => user.discord_id === discordId) || null;
}

function findUsersByEmail(email) {
  const database = readDatabase();
  return database.filter(user => user.email && user.email.toLowerCase() === email.toLowerCase());
}

function findUsersByIp(ip) {
  const database = readDatabase();
  return database.filter(user => user.ip === ip);
}

function addUser(userData) {
  const database = readDatabase();
  const existingIndex = database.findIndex(user => user.discord_id === userData.discord_id);
  if (existingIndex !== -1) {
    database[existingIndex] = userData;
    writeDatabase(database);
    return userData;
  }
  database.push(userData);
  writeDatabase(database);
  return userData;
}

function addLimitRecord(queryUserId, targetUserId, queryType) {
  const limits = readLimits();
  limits.push({ queryUserId, targetUserId, queryType, timestamp: Date.now() });
  writeLimits(limits);
}

function checkLimit(userId, limit = 10, timeWindow = 3600000) {
  const limits = readLimits();
  const now = Date.now();
  const userQueries = limits.filter(r => r.queryUserId === userId && (now - r.timestamp) < timeWindow);
  const used = userQueries.length;
  const remaining = Math.max(0, limit - used);
  const oldestQuery = userQueries.length > 0 ? Math.min(...userQueries.map(q => q.timestamp)) : now;
  return { allowed: used < limit, used, remaining, limit, resetTime: oldestQuery + timeWindow };
}

function getStats() {
  const database = readDatabase();
  const limits = readLimits();
  const uniqueEmails = new Set(database.filter(u => u.email).map(u => u.email.toLowerCase())).size;
  const uniqueIps = new Set(database.filter(u => u.ip).map(u => u.ip)).size;
  return { totalUsers: database.length, uniqueEmails, uniqueIps, totalQueries: limits.length };
}

function readPackages() {
  try {
    if (!fs.existsSync(PACKAGES_PATH)) return [];
    return JSON.parse(fs.readFileSync(PACKAGES_PATH, "utf8"));
  } catch (error) {
    console.error("Paketler okuma hatası:", error);
    return [];
  }
}

function writePackages(data) {
  try {
    fs.writeFileSync(PACKAGES_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Paketler yazma hatası:", error);
  }
}

function readUserPackages() {
  try {
    if (!fs.existsSync(USER_PACKAGES_PATH)) return [];
    return JSON.parse(fs.readFileSync(USER_PACKAGES_PATH, "utf8"));
  } catch (error) {
    console.error("Kullanıcı paketleri okuma hatası:", error);
    return [];
  }
}

function writeUserPackages(data) {
  try {
    fs.writeFileSync(USER_PACKAGES_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Kullanıcı paketleri yazma hatası:", error);
  }
}

function getUserPackage(userId) {
  const userPackages = readUserPackages();
  return userPackages.find(pkg => pkg.user_id === userId && pkg.is_active) || null;
}

function assignPackage(userId, packageName, packageLimit, assignedBy) {
  const userPackages = readUserPackages();
  const existingIndex = userPackages.findIndex(pkg => pkg.user_id === userId && pkg.is_active);
  if (existingIndex !== -1) userPackages[existingIndex].is_active = false;
  const newPackage = { user_id: userId, package_name: packageName, package_limit: packageLimit, used: 0, assigned_by: assignedBy, assigned_at: Date.now(), is_active: true };
  userPackages.push(newPackage);
  writeUserPackages(userPackages);
  return newPackage;
}

function incrementPackageUsage(userId) {
  const userPackages = readUserPackages();
  const packageIndex = userPackages.findIndex(pkg => pkg.user_id === userId && pkg.is_active);
  if (packageIndex !== -1) {
    userPackages[packageIndex].used += 1;
    writeUserPackages(userPackages);
    return userPackages[packageIndex];
  }
  return null;
}

function decrementPackageUsage(userId) {
  const userPackages = readUserPackages();
  const packageIndex = userPackages.findIndex(pkg => pkg.user_id === userId && pkg.is_active);
  if (packageIndex !== -1 && userPackages[packageIndex].used > 0) {
    userPackages[packageIndex].used -= 1;
    writeUserPackages(userPackages);
    return userPackages[packageIndex];
  }
  return null;
}

function checkPackageLimit(userId) {
  const userPackage = getUserPackage(userId);
  if (!userPackage) return { allowed: false, reason: 'Paketiniz bulunmuyor!', remaining: 0, package: null };
  const remaining = userPackage.package_limit - userPackage.used;
  if (remaining <= 0) return { allowed: false, reason: `Paket limitiniz dolmuş! (${userPackage.used}/${userPackage.package_limit})`, remaining: 0, package: userPackage };
  return { allowed: true, remaining, package: userPackage };
}

function listPackages() {
  return readPackages();
}

function addOrUpdatePackage(packageData) {
  const packages = readPackages();
  const existingIndex = packages.findIndex(pkg => pkg.name.toLowerCase() === packageData.name.toLowerCase());
  if (existingIndex !== -1) packages[existingIndex] = { ...packages[existingIndex], ...packageData };
  else packages.push(packageData);
  writePackages(packages);
  return packageData;
}

function deletePackage(packageName) {
  const packages = readPackages();
  const filtered = packages.filter(pkg => pkg.name.toLowerCase() !== packageName.toLowerCase());
  if (filtered.length !== packages.length) {
    writePackages(filtered);
    return true;
  }
  return false;
}

module.exports = {
  readDatabase,
  writeDatabase,
  readLimits,
  writeLimits,
  findUserByDiscordId,
  findUsersByEmail,
  findUsersByIp,
  addUser,
  addLimitRecord,
  checkLimit,
  getStats,
  readPackages,
  writePackages,
  readUserPackages,
  writeUserPackages,
  getUserPackage,
  assignPackage,
  incrementPackageUsage,
  decrementPackageUsage,
  checkPackageLimit,
  listPackages,
  addOrUpdatePackage,
  deletePackage
};