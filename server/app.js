const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const webRoutes = require('./routes/web');
const WebSocketManager = require('./services/websocket');

const app = express();
const server = http.createServer(app);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, './public')));

app.use('/', webRoutes);

new WebSocketManager(server);

server.listen(8000, () => console.log('Server running on http://localhost:8000'));
