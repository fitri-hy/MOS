const { exec } = require('child_process');

function executeCommand(command, callback) {
    exec(command, (err, stdout, stderr) => {
        const output = stdout || stderr || (err ? err.message : '');
        callback(output);
    });
}

module.exports = { executeCommand };
