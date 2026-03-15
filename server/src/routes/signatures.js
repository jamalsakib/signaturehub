const router = require('express').Router();
const { getSignature, previewSignatureHandler, trackClick } = require('../controllers/signatureController');
const { authenticate, authenticateApiKey } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// Public click tracking (no auth — just a redirect)
router.get('/track/:campaignId', trackClick);

// Outlook add-in: API key protected
router.get('/:userEmailOrId', authenticateApiKey, getSignature);

// Admin preview: JWT + role protected
router.post('/preview', authenticate, authorize('admin', 'marketing'), previewSignatureHandler);

module.exports = router;
