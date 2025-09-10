const WebSocket = require('ws');
const os = require('os');
const { getSystemStats } = require('./monitor');
const { executeCommand } = require('./commands');
const { sendActivity } = require('./activity');

function connectAgent(serverUrl, agentId) {
    const ws = new WebSocket(serverUrl);

    ws.on('open', () => {
        console.log('Connected to server');

        ws.send(JSON.stringify({ 
            type: 'register', 
            agentId,
            platform: os.platform()
        }));

        ws.agentId = agentId;

        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'monitor',
                    agentId,
                    stats: getSystemStats()
                }));
            }
        }, 5000);
    });

    ws.on('message', (msg) => {
        let data;
        try { 
            data = JSON.parse(msg.toString()); 
        } catch { 
            return; 
        }

        if (data.type === 'command') {
            executeCommand(data.command, (output) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'output',
                        agentId,
                        command: data.command,
                        output
                    }));
                }
            });
        }

        if (data.type === 'get_activity') {
            sendActivity(ws, agentId);
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from server, reconnect in 3s...');
        setTimeout(() => connectAgent(serverUrl, agentId), 3000);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        ws.close();
    });
}

module.exports = { connectAgent };
