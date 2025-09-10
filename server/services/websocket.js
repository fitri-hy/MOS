const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { saveAgentData, loadAgentData } = require('./monitor');
const { saveAgentActivity } = require('./activity');
const { isCommandBlocked } = require('./command');

const AGENTS_FILE = path.join(__dirname, '../database/agents.json');

const AGENT_ACTIVITY_INTERVAL = 5000;
const AGENT_STATS_INTERVAL = 5000;

class WebSocketManager {
    constructor(server) {
        this.dashboardClients = [];
        this.init(server);
    }

    init(server) {
        this.wssAgents = new WebSocket.Server({ noServer: true });
        this.wssDashboard = new WebSocket.Server({ noServer: true });

        server.on('upgrade', (req, socket, head) => {
            if (req.url === '/ws/agent') {
                this.wssAgents.handleUpgrade(req, socket, head, ws => this.handleAgent(ws));
            } else if (req.url === '/ws/dashboard') {
                this.wssDashboard.handleUpgrade(req, socket, head, ws => this.handleDashboard(ws));
            } else {
                socket.destroy();
            }
        });
    }

    loadAgents() {
        if (!fs.existsSync(AGENTS_FILE)) return [];
        return JSON.parse(fs.readFileSync(AGENTS_FILE));
    }

    saveAgents(agents) {
        fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
    }

    handleAgent(ws) {
        let agentId = null;
        let statsInterval, activityInterval;

        ws.on('message', msg => {
            let data;
            try { data = JSON.parse(msg.toString()); } catch { return; }

            if (data.type === 'register') {
                agentId = data.agentId;
                const platform = data.platform || 'unknown';
                ws.agentId = agentId;

                const agents = this.loadAgents();
                const existing = agents.find(a => a.id === agentId);
                if (!existing) {
                    agents.push({ id: agentId, status: 'online', platform });
                } else {
                    existing.status = 'online';
                    existing.platform = platform;
                }
                this.saveAgents(agents);
                this.broadcastAgentStatus();

                statsInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'get_stats' }));
                }, AGENT_STATS_INTERVAL);

                activityInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'get_activity' }));
                }, AGENT_ACTIVITY_INTERVAL);
            }

            if (data.type === 'monitor') {
                const history = saveAgentData(data.agentId, data.stats);
                this.broadcastToDashboard(JSON.stringify({
                    type: 'monitor',
                    agentId: data.agentId,
                    stats: data.stats,
                    history
                }));
            }

            if (data.type === 'activity') {
                const activityData = {
                    timestamp: data.timestamp,
                    openApplications: data.openApplications
                };
                saveAgentActivity(data.agentId, activityData);
                this.broadcastToDashboard(JSON.stringify({
                    type: 'activity',
                    agentId: data.agentId,
                    activity: activityData
                }));
            }

            if (data.type === 'output') {
                this.broadcastToDashboard(JSON.stringify(data));
            }
        });

        ws.on('close', () => {
            clearInterval(statsInterval);
            clearInterval(activityInterval);
            if (agentId) {
                const agents = this.loadAgents();
                const agent = agents.find(a => a.id === agentId);
                if (agent) agent.status = 'offline';
                this.saveAgents(agents);
                this.broadcastAgentStatus();
            }
        });
    }

    handleDashboard(ws) {
        this.dashboardClients.push(ws);
        this.sendAgentList(ws);

        ws.on('message', msg => {
            let data;
            try { data = JSON.parse(msg.toString()); } catch { return; }

            if (data.type === 'command') {
                const targets = data.targets || [];
                const commandText = data.command;

                if (isCommandBlocked(commandText)) {
                    ws.send(JSON.stringify({ type: 'output', output: `Command "${commandText}" is blocked!` }));
                    return;
                }

                const command = JSON.stringify({ type: 'command', command: commandText });
                const agents = this.loadAgents();

                this.wssAgents.clients.forEach(wsAgent => {
                    const agentId = wsAgent.agentId;
                    const agent = agents.find(a => a.id === agentId);

                    if (agent && agent.status === 'online' && (targets.length === 0 || targets.includes(agent.id))) {
                        wsAgent.send(command);
                    }
                });
            }
        });

        ws.on('close', () => {
            this.dashboardClients = this.dashboardClients.filter(d => d !== ws);
        });
    }

    broadcastToDashboard(msg) {
        this.dashboardClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
    }

    sendAgentList(ws) {
        const agents = this.loadAgents();
        const agentsWithHistory = agents.map(a => {
            const history = loadAgentData(a.id);
            return { ...a, history };
        });
        ws.send(JSON.stringify({ type: 'agent_list', agents: agentsWithHistory }));
    }

    broadcastAgentStatus() {
        const agents = this.loadAgents();
        this.broadcastToDashboard(JSON.stringify({ type: 'agent_list', agents }));
    }
}

module.exports = WebSocketManager;
