const BusinessUnit = require('../models/BusinessUnit');
const { cacheDelPattern } = require('../config/redis');

// GET /api/business-units
async function listBusinessUnits(req, res, next) {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const units = await BusinessUnit.find(filter)
      .populate('defaultTemplate', 'name layout')
      .sort({ name: 1 })
      .lean();
    res.json({ data: units });
  } catch (err) {
    next(err);
  }
}

// GET /api/business-units/:id
async function getBusinessUnit(req, res, next) {
  try {
    const unit = await BusinessUnit.findById(req.params.id)
      .populate('defaultTemplate')
      .lean();
    if (!unit) return res.status(404).json({ error: 'Business unit not found' });
    res.json(unit);
  } catch (err) {
    next(err);
  }
}

// POST /api/business-units
async function createBusinessUnit(req, res, next) {
  try {
    const unit = await BusinessUnit.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(unit);
  } catch (err) {
    next(err);
  }
}

// PUT /api/business-units/:id
async function updateBusinessUnit(req, res, next) {
  try {
    const unit = await BusinessUnit.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!unit) return res.status(404).json({ error: 'Business unit not found' });

    // Invalidate all cached signatures for this BU's users
    await cacheDelPattern('sig:*');

    res.json(unit);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/business-units/:id
async function deleteBusinessUnit(req, res, next) {
  try {
    const unit = await BusinessUnit.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!unit) return res.status(404).json({ error: 'Business unit not found' });
    res.json({ message: 'Business unit deactivated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listBusinessUnits, getBusinessUnit, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit };
