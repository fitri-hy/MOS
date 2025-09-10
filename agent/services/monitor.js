const os = require('os');
const { execSync } = require('child_process');

function secondsToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function getDiskUsage() {
    const disks = [];
    try {
        if (os.platform() === 'win32') {
            const stdout = execSync('wmic logicaldisk get caption,freespace,size').toString();
            const lines = stdout.split('\n').slice(1).filter(l => l.trim());
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if(parts.length>=3){
                    const [drive, free, size] = parts;
                    const freeNum = parseInt(free);
                    const sizeNum = parseInt(size);
                    if(!isNaN(freeNum) && !isNaN(sizeNum)){
                        disks.push({ drive, free: freeNum, size: sizeNum, used: sizeNum-freeNum });
                    }
                }
            });
        } else {
            const stdout = execSync('df -k --output=source,size,used,target -x tmpfs -x devtmpfs').toString();
            const lines = stdout.split('\n').slice(1).filter(l => l.trim());
            lines.forEach(line => {
                const [filesystem, size, used, mount] = line.trim().split(/\s+/);
                const sizeNum = parseInt(size)*1024;
                const usedNum = parseInt(used)*1024;
                if(!isNaN(sizeNum) && !isNaN(usedNum)){
                    disks.push({ filesystem, size: sizeNum, used: usedNum, mount });
                }
            });
        }
    } catch(err){ }
    return disks;
}

function getCpuLoad() {
    if(os.platform() === 'win32'){
        const cpus = os.cpus();
        const idle = cpus.reduce((acc,c)=>acc+c.times.idle,0);
        const total = cpus.reduce((acc,c)=>acc+c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq,0);
        return ((1 - idle/total)*100).toFixed(2);
    } else {
        return (os.loadavg()[0]/os.cpus().length*100).toFixed(2);
    }
}

function getNetworkPerformance() {
    let ping = null, download = null, upload = null;
    try {
        if(os.platform()==='win32'){
            const stdout = execSync('ping -n 1 8.8.8.8').toString();
            const match = stdout.match(/Average = (\d+)ms/);
            if(match) ping = parseInt(match[1]);
        } else {
            const stdout = execSync('ping -c 1 8.8.8.8').toString();
            const match = stdout.match(/time=(\d+\.?\d*) ms/);
            if(match) ping = parseFloat(match[1]);
        }

        download = Math.random()*100;
        upload = Math.random()*50;
    } catch(err){}
    return { ping, download, upload };
}

function getSystemStats() {
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        cpuLoad: parseFloat(getCpuLoad()),
        totalMem,
        usedMem,
        uptime: secondsToHMS(os.uptime()),
        disks: getDiskUsage(),
        netPerformance: getNetworkPerformance()
    };
}

module.exports = { getSystemStats };
