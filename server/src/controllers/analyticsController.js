const Campaign = require('../models/Campaign');
const ClickEvent = require('../models/ClickEvent');
const User = require('../models/User');
const SignatureTemplate = require('../models/SignatureTemplate');
const BusinessUnit = require('../models/BusinessUnit');

// GET /api/analytics/dashboard
async function getDashboard(req, res, next) {
  try {
    const [
      totalUsers, activeUsers,
      totalTemplates,
      activeCampaigns, totalCampaigns,
      totalBusinessUnits,
      engagement,
      usersByDepartment,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      SignatureTemplate.countDocuments({ isActive: true }),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({}),
      BusinessUnit.countDocuments({ isActive: true }),
      Campaign.aggregate([
        { $group: { _id: null, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' } } },
      ]),
      User.aggregate([
        { $match: { isActive: true, department: { $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const eng = engagement[0] || { impressions: 0, clicks: 0 };
    const ctr = eng.impressions > 0 ? ((eng.clicks / eng.impressions) * 100).toFixed(1) : '0';

    res.json({
      users: { total: totalUsers, active: activeUsers },
      templates: { total: totalTemplates },
      campaigns: { active: activeCampaigns, total: totalCampaigns },
      businessUnits: { total: totalBusinessUnits },
      engagement: { impressions: eng.impressions, clicks: eng.clicks, ctr: parseFloat(ctr) },
      usersByDepartment,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/campaigns
async function getCampaignStats(req, res, next) {
  try {
    const filter = {};
    if (req.query.businessUnit) filter.businessUnit = req.query.businessUnit;
    if (req.query.status) filter.status = req.query.status;

    const campaigns = await Campaign.find(filter)
      .populate('businessUnit', 'name slug')
      .select('name status startDate endDate impressions clicks businessUnit utmCampaign')
      .sort({ startDate: -1 })
      .lean();

    const stats = campaigns.map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%' : '0%',
    }));

    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/campaigns/:id
async function getCampaignDetail(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Aggregate clicks by day
    const clicksByDay = await ClickEvent.aggregate([
      { $match: { campaign: campaign._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      campaign,
      ctr: campaign.impressions > 0
        ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) + '%'
        : '0%',
      clicksByDay,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getCampaignStats, getCampaignDetail };
