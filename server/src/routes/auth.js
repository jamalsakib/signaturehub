const router = require('express').Router();
const { login, callback, refresh, logout, me, devLogin, testConnection } = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');

router.get('/login', login);
router.get('/callback', callback);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/dev-login', devLogin);
router.get('/test-connection', authenticate, testConnection);

module.exports = router;
