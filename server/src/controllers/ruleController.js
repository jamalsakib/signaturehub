const Rule = require('../models/Rule');
const User = require('../models/User');
const { evaluateRules } = require('../services/ruleEngine');
const { cacheDelPattern } = require('../config/redis');

// GET /api/rules
async function listRules(req, res, next) {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const rules = await Rule.find(filter)
      .populate('assignTemplate', 'name')
      .populate('assignBusinessUnit', 'name slug')
      .sort({ priority: 1 })
      .lean();

    res.json(rules);
  } catch (err) {
    next(err);
  }
}

// GET /api/rules/:id
async function getRule(req, res, next) {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate('assignTemplate')
      .populate('assignBusinessUnit')
      .lean();
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

// POST /api/rules
async function createRule(req, res, next) {
  try {
    const rule = await Rule.create({ ...req.body, createdBy: req.user._id });
    await cacheDelPattern('sig:*');
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

// PUT /api/rules/:id
async function updateRule(req, res, next) {
  try {
    const rule = await Rule.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    await cacheDelPattern('sig:*');
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/rules/:id
async function deleteRule(req, res, next) {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    await cacheDelPattern('sig:*');
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/rules/evaluate  — test rules against a user or custom attributes
async function evaluateRulesForUser(req, res, next) {
  try {
    const { userId, attributes } = req.body;

    let userAttrs = attributes || {};
    if (userId) {
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ error: 'User not found' });
      userAttrs = { ...user, ...attributes };
    }

    const rules = await Rule.find({ isActive: true })
      .sort({ priority: 1 })
      .populate('assignTemplate assignBusinessUnit')
      .lean();

    const result = evaluateRules(rules, userAttrs);
    res.json({
      matched: !!result.matchedRule,
      matchedRule: result.matchedRule,
      assignedTemplate: result.template,
      assignedBusinessUnit: result.businessUnit,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRules, getRule, createRule, updateRule, deleteRule, evaluateRulesForUser };
