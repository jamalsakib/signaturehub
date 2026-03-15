const SignatureTemplate = require('../models/SignatureTemplate');
const { previewSignature } = require('../services/signatureEngine');
const { cacheDelPattern } = require('../config/redis');

// GET /api/templates
async function listTemplates(req, res, next) {
  try {
    const filter = {};
    if (req.query.businessUnit) filter.businessUnit = req.query.businessUnit;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.layout) filter.layout = req.query.layout;

    const templates = await SignatureTemplate.find(filter)
      .populate('businessUnit', 'name slug')
      .select('-htmlTemplate -plainTextTemplate')
      .sort({ businessUnit: 1, isDefault: -1, name: 1 })
      .lean();

    res.json({ data: templates });
  } catch (err) {
    next(err);
  }
}

// GET /api/templates/:id
async function getTemplate(req, res, next) {
  try {
    const template = await SignatureTemplate.findById(req.params.id)
      .populate('businessUnit')
      .lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
}

// POST /api/templates
async function createTemplate(req, res, next) {
  try {
    const template = await SignatureTemplate.create({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

// PUT /api/templates/:id
async function updateTemplate(req, res, next) {
  try {
    const template = await SignatureTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedBy: req.user._id } },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });

    await cacheDelPattern('sig:*');
    res.json(template);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/templates/:id
async function deleteTemplate(req, res, next) {
  try {
    const template = await SignatureTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });

    await cacheDelPattern('sig:*');
    res.json({ message: 'Template deactivated' });
  } catch (err) {
    next(err);
  }
}

// POST /api/templates/:id/preview
async function previewTemplate(req, res, next) {
  try {
    const { htmlTemplate, ...overrides } = req.body || {};
    const result = await previewSignature(req.params.id, overrides, htmlTemplate || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/templates/:id/clone
async function cloneTemplate(req, res, next) {
  try {
    const original = await SignatureTemplate.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ error: 'Template not found' });

    const { _id, createdAt, updatedAt, version, isDefault, ...rest } = original;
    const clone = await SignatureTemplate.create({
      ...rest,
      name: `${rest.name} (Copy)`,
      isDefault: false,
      version: 1,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    res.status(201).json(clone);
  } catch (err) {
    next(err);
  }
}

module.exports = { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, previewTemplate, cloneTemplate };
