const ws = new WebSocket("ws://192.168.1.42:8000/ws/dashboard");
let agents = [];
let charts = {};

ws.onmessage = async (event) => {
    let text = event.data;
    if(event.data instanceof Blob) text = await event.data.text();
    let data;
    try { data = JSON.parse(text); } catch { return; }

	if(data.type === 'output') {
		const outputEl = document.getElementById('output');
		if(data.agentId && data.command) {
			outputEl.textContent += `[${data.agentId}] ${data.command}\n${data.output}\n`;
		} else {
			outputEl.textContent += `${data.output}\n`;
		}
		outputEl.scrollTop = outputEl.scrollHeight;
	}

    if(data.type==='agent_list'){ 
        agents = data.agents.map(a => ({
            ...a,
            history: a.history || { cpu: [], ram: [], disk: [], network: [] }
        }));
        renderAgentCards(); 
		updateCounters();
    }

    if(data.type==='monitor'){
        const agent = agents.find(a => a.id === data.agentId);
        if(agent){
            agent.stats = data.stats;

            agent.history.cpu.push(parseFloat(data.stats.cpuLoad));
            if(agent.history.cpu.length>30) agent.history.cpu.shift();

            agent.history.ram.push([
                (data.stats.usedMem/1024/1024).toFixed(0),
                ((data.stats.totalMem - data.stats.usedMem)/1024/1024).toFixed(0)
            ]);
            if(agent.history.ram.length>30) agent.history.ram.shift();

            if(data.stats.disks){
                const diskData = data.stats.disks.map(d => ({
                    label: d.drive || d.mount || d.filesystem || 'unknown',
                    used: ((d.used || 0)/1024/1024).toFixed(0),
                    free: (((d.size || 0) - (d.used || 0))/1024/1024).toFixed(0)
                }));
                agent.history.disk.push(diskData);
                if(agent.history.disk.length>30) agent.history.disk.shift();
            }

            agent.history.network.push([
                data.stats.netPerformance?.ping || 0,
                data.stats.netPerformance?.download || 0,
                data.stats.netPerformance?.upload || 0
            ]);
            if(agent.history.network.length>30) agent.history.network.shift();

            updateAgentCard(agent);
        }
    }
};

function updateCounters() {
    const totalAgents = agents.length;
    const totalOnline = agents.filter(a => a.status === 'online').length;
    const totalOffline = totalAgents - totalOnline;

    document.getElementById('totalAgents').textContent = totalAgents;
    document.getElementById('totalOnline').textContent = totalOnline;
    document.getElementById('totalOffline').textContent = totalOffline;
}

function renderAgentCards() {
    const container = document.getElementById('agent-cards');
    container.innerHTML = '';
    charts = {};

    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = `bg-white p-4 rounded shadow-sm ${agent.status==='online' ? 'border-emerald-500 border-2' : 'border-rose-500 border-2'}`;
        card.id = `card-${agent.id}`;

        // Header
        const header = document.createElement('div');
        header.className = 'flex items-center font-bold justify-between gap-4 mb-4';

        const agentName = document.createElement('div');
        agentName.className = 'flex flex-col';
        agentName.innerHTML = `
            <a href="/dashboard/agent/${agent.id}" class="hover:underline text-blue-600 overflow-hidden line-clamp-1">
                ${agent.id}
            </a>
            <span class="text-xs font-normal">${agent.status} - ${agent.platform || ''}</span>
        `;
        header.appendChild(agentName);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex items-center gap-1';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.agentId = agent.id;
        checkbox.className = `
          h-5 w-5
          appearance-none
          border border-gray-300
          rounded-full
          bg-gray-100
          checked:bg-indigo-600
          checked:border-indigo-600
          cursor-pointer
          relative
          before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-white checked:before:block
          transition duration-200
        `;
        checkbox.style.pointerEvents = 'auto';
        controlsDiv.appendChild(checkbox);

        const deleteBtn = document.createElement('a');
		deleteBtn.href = `/dashboard/agent/${agent.id}/delete`;
		deleteBtn.className = 'text-rose-500 hover:text-rose-600 hover:duration-300';
		deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 6.386c0-.484.345-.877.771-.877h2.665c.529-.016.996-.399 1.176-.965l.03-.1l.115-.391c.07-.24.131-.45.217-.637c.338-.739.964-1.252 1.687-1.383c.184-.033.378-.033.6-.033h3.478c.223 0 .417 0 .6.033c.723.131 1.35.644 1.687 1.383c.086.187.147.396.218.637l.114.391l.03.1c.18.566.74.95 1.27.965h2.57c.427 0 .772.393.772.877s-.345.877-.771.877H3.77c-.425 0-.77-.393-.77-.877"/><path fill="currentColor" fill-rule="evenodd" d="M11.596 22h.808c2.783 0 4.174 0 5.08-.886c.904-.886.996-2.339 1.181-5.245l.267-4.188c.1-1.577.15-2.366-.303-2.865c-.454-.5-1.22-.5-2.753-.5H8.124c-1.533 0-2.3 0-2.753.5s-.404 1.288-.303 2.865l.267 4.188c.185 2.906.277 4.36 1.182 5.245c.905.886 2.296.886 5.079.886m-1.35-9.811c-.04-.434-.408-.75-.82-.707c-.413.043-.713.43-.672.864l.5 5.263c.04.434.408.75.82.707c.413-.043.713-.43.672-.864zm4.329-.707c.412.043.713.43.671.864l-.5 5.263c-.04.434-.409.75-.82.707c-.413-.043-.713-.43-.672-.864l.5-5.263c.04-.434.409-.75.82-.707" clip-rule="evenodd"/></svg>`;
		controlsDiv.appendChild(deleteBtn);

        header.appendChild(controlsDiv);
        card.appendChild(header);

        const cpuCanvas = document.createElement('canvas'); cpuCanvas.height=80; card.appendChild(cpuCanvas);
        const ramCanvas = document.createElement('canvas'); ramCanvas.height=80; card.appendChild(ramCanvas);
        const diskCanvas = document.createElement('canvas'); diskCanvas.height=80; card.appendChild(diskCanvas);
        const netCanvas = document.createElement('canvas'); netCanvas.height=180; card.appendChild(netCanvas);

        // Stats
        const statsDiv = document.createElement('div');
        statsDiv.id = `stats-${agent.id}`;
        statsDiv.className = 'text-sm font-mono mt-2 whitespace-pre-wrap';
        statsDiv.innerHTML = `<div class="px-3 py-2 bg-rose-500 text-white text-center">Uptime: - - -</div>`;
        card.appendChild(statsDiv);

        container.appendChild(card);

        const cpuHist = agent.history.cpu.slice(-30);
        const ramHist = agent.history.ram.slice(-30);
        const diskHist = agent.history.disk.slice(-30);
        const netHist = agent.history.network.slice(-30);

        charts[agent.id] = {
            cpu: new Chart(cpuCanvas.getContext('2d'), {
                type: 'bar',
                data: { labels: Array(cpuHist.length).fill(''), datasets:[{label:'CPU', data: cpuHist, backgroundColor:'#3b82f6'}] },
                options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{min:0,max:100}}}
            }),
            ram: new Chart(ramCanvas.getContext('2d'), {
                type: 'bar',
                data: { labels:['Used','Free'], datasets:[{label:'RAM', data: ramHist[ramHist.length-1] || [0,0], backgroundColor:['#10b981','#f97316']}] },
                options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
            }),
            disk: new Chart(diskCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: (diskHist[diskHist.length-1]||[]).map(d=>d.label),
                    datasets:[{label:'Disk Used (MB)', data: (diskHist[diskHist.length-1]||[]).map(d=>d.used), backgroundColor:'#facc15'}]
                },
                options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
            }),
            network: new Chart(netCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: Array(30).fill(''),
                    datasets:[
                        {label:'Ping', data: netHist.map(d=>d[0]), borderColor:'#f97316', backgroundColor:'rgba(249,115,22,0.2)', fill:true, tension:0.3},
                        {label:'Download', data: netHist.map(d=>d[1]), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.2)', fill:true, tension:0.3},
                        {label:'Upload', data: netHist.map(d=>d[2]), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.2)', fill:true, tension:0.3}
                    ]
                },
                options:{responsive:true, plugins:{legend:{display:true}}, scales:{y:{beginAtZero:true}}}
            })
        };
    });
}

function updateAgentCard(agent) {
    const c = charts[agent.id];
    if(!c || !agent.stats) return;

    c.cpu.data.datasets[0].data = agent.history.cpu.slice(-30);
    c.cpu.update();

    const ramLast = agent.history.ram.slice(-1)[0] || [0,0];
    c.ram.data.datasets[0].data = ramLast;
    c.ram.update();

    const diskLast = agent.history.disk.slice(-1)[0] || [];
    c.disk.data.labels = diskLast.map(d=>d.label);
    c.disk.data.datasets[0].data = diskLast.map(d=>d.used);
    c.disk.update();

    const netLast30 = agent.history.network.slice(-30);
    c.network.data.datasets[0].data = netLast30.map(d=>d[0]);
    c.network.data.datasets[1].data = netLast30.map(d=>d[1]);
    c.network.data.datasets[2].data = netLast30.map(d=>d[2]);
    c.network.update();

    const statsDiv = document.getElementById(`stats-${agent.id}`);
    statsDiv.innerHTML = `<div class="px-3 py-2 bg-emerald-500 text-white text-center">Uptime: ${agent.stats.uptime}</div>`;
}

function sendCommand() {
    const input = document.getElementById('command');
    const commandText = input.value.trim();
    if (!commandText) return;

    const selectedAgents = Array.from(document.querySelectorAll('#agent-cards input[type="checkbox"]:checked'))
        .map(cb => cb.dataset.agentId);

	const payload = {
		type: 'command',
		command: commandText,
		targets: selectedAgents.length > 0 ? selectedAgents : null
	};

    ws.send(JSON.stringify(payload));

    const output = document.getElementById('output');
    if(selectedAgents.length > 0) {
        output.textContent += `> ${commandText} (to: ${selectedAgents.join(', ')})\n`;
    } else {
        output.textContent += `> ${commandText} (to: all agents)\n`;
    }
    input.value = '';
}

const commandInput = document.getElementById('command');
commandInput.addEventListener('keydown', function(e) {
	if (e.key === 'Enter') {
		e.preventDefault();
	sendCommand();
	}
});