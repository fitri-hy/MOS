const fs = require('fs');
const path = require('path');

const DATABASE_DIR = path.join(__dirname, '../database');
const BLACKLIST_FILE = path.join(DATABASE_DIR, 'blacklist_cmd.json');

function loadBlacklist() {
    if (!fs.existsSync(BLACKLIST_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(BLACKLIST_FILE));
    } catch (err) {
        console.error('Failed to load blacklist:', err.message);
        return [];
    }
}

function isCommandBlocked(commandText) {
    const BLACKLIST_COMMANDS = loadBlacklist();
    return BLACKLIST_COMMANDS.some(cmd =>
        commandText.trim().toLowerCase().startsWith(cmd.toLowerCase())
    );
}

module.exports = { loadBlacklist, isCommandBlocked };
