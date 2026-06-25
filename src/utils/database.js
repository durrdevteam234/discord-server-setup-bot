const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data');

function readData(file) {
  const filePath = path.join(dataPath, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeData(file, data) {
  const filePath = path.join(dataPath, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateData(file, guildId, userId, data) {
  const fileData = readData(file);
  if (!fileData[guildId]) fileData[guildId] = {};
  if (!fileData[guildId][userId]) fileData[guildId][userId] = {};
  fileData[guildId][userId] = { ...fileData[guildId][userId], ...data };
  writeData(file, fileData);
}

module.exports = { readData, writeData, updateData };
