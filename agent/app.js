const os = require('os');
const { connectAgent } = require('./services/connection');

const SERVER_URL = 'ws://192.168.1.42:8000/ws/agent';
const AGENT_ID = os.hostname();

connectAgent(SERVER_URL, AGENT_ID);
