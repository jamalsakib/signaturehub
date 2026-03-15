const router = require('express').Router();
const { getDashboard, getCampaignStats, getCampaignDetail } = require('../controllers/analyticsController');
const { authorize } = require('../middleware/authorize');

router.get('/dashboard', getDashboard);
router.get('/campaigns', authorize('admin', 'marketing'), getCampaignStats);
router.get('/campaigns/:id', authorize('admin', 'marketing'), getCampaignDetail);

module.exports = router;
