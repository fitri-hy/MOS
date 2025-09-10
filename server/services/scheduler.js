const jobs = [];

function scheduleJob(command, targets, intervalMs, sendCommandFunc) {
    const job = setInterval(() => {
        console.log(`Scheduled job: ${command} -> ${targets.join(',')}`);
        sendCommandFunc(command, targets);
    }, intervalMs);
    jobs.push(job);
    return job;
}

function stopAllJobs() {
    jobs.forEach(job => clearInterval(job));
}

module.exports = { scheduleJob, stopAllJobs };
