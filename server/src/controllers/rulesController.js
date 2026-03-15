const { validationResult } = require('express-validator');
const Rule = require('../models/Rule');
const User = require('../models/User');
const { evaluateRules, evaluateRule } = require('../services/ruleEngine');
const { createError } = require('../middleware/errorHandler');
const { cacheDelPattern } = require('../config/redis');
const logger = require('../utils/logger');

async function listRules(req, res, next) {
  try {
    const rules = await Rule.find({})
      .populate('assignTemplate', 'name layout')
      .populate('assignBusinessUnit', 'name slug')
      .sort({ priority: 1 })
      .lean();
    res.json({ data: rules, total: rules.length });
  } catch (err) {
    next(err);
  }
}

async function getRule(req, res, next) {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate('assignTemplate assignBusinessUnit')
      .lean();
    if (!rule) return next(createError('Rule not found', 404));
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const rule = await Rule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const rule = await Rule.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!rule) return next(createError('Rule not found', 404));
    await cacheDelPattern('sig:*');
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) return next(createError('Rule not found', 404));
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
}

// Test a set of conditions against a specific user without saving
async function testRule(req, res, next) {
  try {
    const { conditions, logic = 'AND', userId } = req.body;

    const user = userId
      ? await User.findById(userId).lean()
      : req.body.user; // Allow passing a mock user object

    if (!user) return next(createError('User not found', 404));

    const mockRule = { conditions, logic, isActive: true };
    const matched = evaluateRule(mockRule, user);

    res.json({
      matched,
      user: { displayName: user.displayName, email: user.email, department: user.department },
      conditions,
    });
  } catch (err) {
    next(err);
  }
}

// Re-evaluate all active rules and reassign templates to all users
async function reapplyRules(req, res, next) {
  try {
    const rules = await Rule.find({ isActive: true })
      .sort({ priority: 1 })
      .populate('assignTemplate assignBusinessUnit')
      .lean();

    const users = await User.find({ isActive: true }).lean();

    let updated = 0;
    const BATCH = 100;

    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (user) => {
          const result = evaluateRules(rules, user);
          const update = {};
          if (result.template) update.assignedTemplate = result.template._id;
          if (result.businessUnit) update.businessUnit = result.businessUnit._id;

          if (Object.keys(update).length > 0) {
            await User.updateOne({ _id: user._id }, { $set: update });
            updated++;
          }
        })
      );
    }

    await cacheDelPattern('sig:*');
    logger.info(`Rules reapplied: ${updated} users updated`);
    res.json({ message: `Rules reapplied. ${updated} users updated.`, total: users.length, updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRules, getRule, createRule, updateRule, deleteRule, testRule, reapplyRules };
