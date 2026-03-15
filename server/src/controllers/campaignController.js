const Campaign = require('../models/Campaign');
const { cacheDelPattern } = require('../config/redis');

// GET /api/campaigns
async function listCampaigns(req, res, next) {
  try {
    const filter = {};
    if (req.query.businessUnit) filter.businessUnit = req.query.businessUnit;
    if (req.query.status) filter.status = req.query.status;

    const campaigns = await Campaign.find(filter)
      .populate('businessUnit', 'name slug')
      .sort({ startDate: -1 })
      .lean();

    res.json(campaigns);
  } catch (err) {
    next(err);
  }
}

// GET /api/campaigns/:id
async function getCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('businessUnit').lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    next(err);
  }
}

// POST /api/campaigns
async function createCampaign(req, res, next) {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

// PUT /api/campaigns/:id
async function updateCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await cacheDelPattern('sig:*');
    res.json(campaign);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/campaigns/:id/status
async function setCampaignStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'scheduled', 'active', 'paused', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await cacheDelPattern('sig:*');
    res.json(campaign);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/campaigns/:id
async function deleteCampaign(req, res, next) {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    await cacheDelPattern('sig:*');
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, setCampaignStatus, deleteCampaign };
