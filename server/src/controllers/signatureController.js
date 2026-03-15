const { generateSignatureForUser, previewSignature } = require('../services/signatureEngine');
const Campaign = require('../models/Campaign');
const ClickEvent = require('../models/ClickEvent');

// GET /api/signatures/:userEmailOrId
// Used by Outlook add-in (API key protected in route)
async function getSignature(req, res, next) {
  try {
    const result = await generateSignatureForUser(req.params.userEmailOrId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/signatures/preview  (admin/marketing only)
async function previewSignatureHandler(req, res, next) {
  try {
    const { templateId, overrides } = req.body;
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const result = await previewSignature(templateId, overrides || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/signatures/track/:campaignId
// Banner click redirect — records click and forwards to the campaign URL
async function trackClick(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { uid } = req.query; // optional userId

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Record event and increment counter (non-blocking)
    ClickEvent.create({
      campaign: campaign._id,
      user: uid || null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers.referer || '',
    }).catch(() => {});

    Campaign.updateOne({ _id: campaign._id }, { $inc: { clicks: 1 } }).catch(() => {});

    const redirectUrl = campaign.trackingUrl || campaign.redirectUrl;
    res.redirect(302, redirectUrl);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSignature, previewSignatureHandler, trackClick };
