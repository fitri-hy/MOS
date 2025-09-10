const fs = require('fs');
const path = require('path');

const DATABASE_DIR = path.join(__dirname, '../database');

function getAgentDir(agentId) {
    const dir = path.join(DATABASE_DIR, agentId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function saveAgentActivity(agentId, newActivity) {
    const activityFile = path.join(getAgentDir(agentId), 'activity.json');
    let activities = [];

    if (fs.existsSync(activityFile)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(activityFile));
            activities = Array.isArray(parsed) ? parsed : [];
        } catch {
            activities = [];
        }
    }

    const newApps = newActivity.openApplications;
    const newProcesses = newApps.map(app => app.process);

    const existingIndex = activities.findIndex(act => {
        const oldProcesses = act.openApplications.map(app => app.process);
        return (
            oldProcesses.length === newProcesses.length &&
            oldProcesses.every((proc, i) => proc === newProcesses[i])
        );
    });

    if (existingIndex !== -1) {
        activities[existingIndex].timestamp = newActivity.timestamp;
        const [existing] = activities.splice(existingIndex, 1);
        activities.unshift(existing);
    } else {
        activities.unshift(newActivity);
    }

    if (activities.length > 30) {
        activities = activities.slice(0, 30);
    }

    try {
        fs.writeFileSync(activityFile, JSON.stringify(activities, null, 2));
    } catch (err) {
        console.error(`Failed to save activity for agent ${agentId}:`, err.message);
    }
}

function loadAgentActivity(agentId) {
    const activityFile = path.join(getAgentDir(agentId), 'activity.json');
    if (!fs.existsSync(activityFile)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(activityFile));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

module.exports = { saveAgentActivity, loadAgentActivity };
