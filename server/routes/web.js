const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const dashboardController = require('../controllers/dashboard');

router.get('/', authController.showLogin);
router.post('/', authController.login);
router.get('/logout', authController.logout);

router.get('/dashboard', dashboardController.showDashboard);
router.get('/dashboard/agent/:id', dashboardController.showAgentDetail);
router.get('/dashboard/agent/:id/delete', dashboardController.deleteAgent);

module.exports = router;
