const fs = require('fs');
const path = require('path');

// FIXED: Automatically maps to Railway's persistent volume path if it exists, 
// otherwise falls back to your local project directory.
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH) 
    : path.join(__dirname, '../data');

// Automatically recreate the 'data' folder on Railway startup if wiped
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(fileName) {
    const filePath = path.join(DATA_DIR, fileName);
    
    // Guard: If Railway wiped the file, return empty data instead of crashing
    if (!fs.existsSync(filePath)) {
        return {}; 
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error reading ${fileName}, resetting data:`, error.message);
        return {};
    }
}

function writeData(fileName, data) {
    const filePath = path.join(DATA_DIR, fileName);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing to ${fileName}:`, error.message);
    }
}

module.exports = { readData, writeData };
