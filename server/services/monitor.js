const fs = require('fs');
const path = require('path');

const DATABASE_DIR = path.join(__dirname, '../database');

function getAgentDir(agentId) {
    const dir = path.join(DATABASE_DIR, agentId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getMonitorFile(agentId) {
    const file = path.join(getAgentDir(agentId), 'monitor.json');
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ cpu: [], ram: [], disk: [], network: [] }, null, 2));
    return file;
}

function loadAgentData(agentId) {
    return JSON.parse(fs.readFileSync(getMonitorFile(agentId)));
}

function saveAgentData(agentId, stats) {
    const data = loadAgentData(agentId);

    data.cpu.push(stats.cpuLoad);
    if (data.cpu.length > 30) data.cpu.shift();

    const used = (stats.usedMem / 1024 / 1024).toFixed(0);
    const free = ((stats.totalMem - stats.usedMem) / 1024 / 1024).toFixed(0);
    data.ram.push([used, free]);
    if (data.ram.length > 30) data.ram.shift();

    if (stats.disks) {
        const diskData = stats.disks.map(d => ({
            label: d.drive || d.mount || d.filesystem || 'unknown',
            used: ((d.used || 0)/1024/1024).toFixed(0),
            free: (((d.size || 0) - (d.used || 0))/1024/1024).toFixed(0)
        }));
        data.disk.push(diskData);
        if (data.disk.length > 30) data.disk.shift();
    }

    if (stats.netPerformance) {
        const net = [
            stats.netPerformance.ping || 0,
            stats.netPerformance.download || 0,
            stats.netPerformance.upload || 0
        ];
        data.network.push(net);
        if (data.network.length > 30) data.network.shift();
    }

    fs.writeFileSync(getMonitorFile(agentId), JSON.stringify(data, null, 2));
    return data;
}

module.exports = { loadAgentData, saveAgentData };
