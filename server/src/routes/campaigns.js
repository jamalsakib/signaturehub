const router = require('express').Router();
const { listCampaigns, getCampaign, createCampaign, updateCampaign, setCampaignStatus, deleteCampaign } = require('../controllers/campaignController');
const { authorize } = require('../middleware/authorize');

router.get('/', listCampaigns);
router.get('/:id', getCampaign);
router.post('/', authorize('admin', 'marketing'), createCampaign);
router.put('/:id', authorize('admin', 'marketing'), updateCampaign);
router.patch('/:id/status', authorize('admin', 'marketing'), setCampaignStatus);
router.delete('/:id', authorize('admin'), deleteCampaign);

module.exports = router;
