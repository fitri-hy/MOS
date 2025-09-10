const fs = require("fs").promises;
const path = require("path");

const showDashboard = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/");

        const agentsPath = path.join(__dirname, "../database/agents.json");
        const data = await fs.readFile(agentsPath, "utf-8");
        const agents = JSON.parse(data);

        const totalAgents = agents.length;
        const totalOnline = agents.filter(a => a.status === "online").length;
        const totalOffline = agents.filter(a => a.status === "offline").length;

        res.render("dashboard", {
            username: user.username,
            role: user.role,
            totalAgents,
            totalOnline,
            totalOffline
        });
    } catch (err) {
        console.error("Error reading agents.json:", err);
        res.status(500).send("Internal Server Error");
    }
};

const showAgentDetail = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/");

        const agentId = req.params.id;
        const activityFile = path.join(__dirname, '../database', agentId, 'activity.json');

        let activities = [];
        try {
            const data = await fs.readFile(activityFile, 'utf-8');
            const json = JSON.parse(data);

            if (Array.isArray(json)) {
                activities = json;
            } else if (typeof json === 'object' && json !== null) {
                activities = [json];
            }

        } catch (err) {
            console.warn(`No activity data for agent ${agentId}`);
        }

        res.render('agent_detail', {
            username: user.username,
            agentId,
            activities
        });
    } catch (err) {
        console.error("Error reading agent activity:", err);
        res.status(500).send("Internal Server Error");
    }
};

const deleteAgent = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/");

        const agentId = req.params.id;
        const agentsPath = path.join(__dirname, "../database/agents.json");

        const data = await fs.readFile(agentsPath, "utf-8");
        const agents = JSON.parse(data);
        const updatedAgents = agents.filter(a => a.id !== agentId);
        await fs.writeFile(agentsPath, JSON.stringify(updatedAgents, null, 2));

        const agentFolder = path.join(__dirname, "../database", agentId);
        try {
            await fs.rm(agentFolder, { recursive: true, force: true });
        } catch (err) {
            console.error(`Failed ${agentFolder}:`, err);
        }

        res.redirect("/dashboard");
    } catch (err) {
        console.error("Error deleting agent:", err);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { showDashboard, showAgentDetail, deleteAgent };
