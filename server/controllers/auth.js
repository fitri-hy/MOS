const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, '../database/users.json');

function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

const showLogin = (req, res) => {
    res.render('login', { error: null });
};

const login = (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = { username: user.username, role: user.role };
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Username atau password salah' });
    }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

module.exports = { showLogin, login, logout };
