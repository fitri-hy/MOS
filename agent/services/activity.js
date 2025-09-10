const os = require('os');
const activeWin = require('active-win');

async function getOpenApplications() {
    try {
        const window = await activeWin();
        if (window) {
            return [{
                process: window.owner.name,
                title: window.title
            }];
        }
        return [];
    } catch (err) {
        console.error('Error getting active window:', err);
        return [];
    }
}

async function sendActivity(ws, agentId) {
    if (ws.readyState !== 1) return;

    const apps = await getOpenApplications();
    const payload = {
        type: 'activity',
        agentId,
        timestamp: new Date(),
        openApplications: apps
    };

    try {
        ws.send(JSON.stringify(payload));
    } catch (err) {
        console.error('Error sending activity via websocket:', err);
    }
}

module.exports = { getOpenApplications, sendActivity };
