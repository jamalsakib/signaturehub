const router = require('express').Router();
const { triggerFullSync, triggerUserSync, getSyncStatus } = require('../controllers/syncController');
const { authorize } = require('../middleware/authorize');

router.get('/status', authorize('admin'), getSyncStatus);
router.post('/all', authorize('admin'), triggerFullSync);
router.post('/user/:azureId', authorize('admin'), triggerUserSync);

module.exports = router;
