const User = require('../models/User');
const { cacheDel, cacheDelPattern } = require('../config/redis');
const { syncSingleUser } = require('../services/syncService');

// GET /api/users
async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 50, department, businessUnit, role, search, isActive } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (businessUnit) filter.businessUnit = businessUnit;
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ displayName: re }, { email: re }, { jobTitle: re }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-__v')
        .populate('businessUnit', 'name slug')
        .populate('assignedTemplate', 'name')
        .sort({ displayName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      data: users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate('businessUnit')
      .populate('assignedTemplate')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id
async function updateUser(req, res, next) {
  try {
    const allowed = ['role', 'assignedTemplate', 'businessUnit', 'customAttributes', 'isActive'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await cacheDel(`user:${user._id}`);
    await cacheDel(`sig:${user.email}`);
    await cacheDel(`sig:${user.azureId}`);

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/sync
async function syncUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await syncSingleUser(user.azureId);
    await cacheDel(`user:${user._id}`);
    await cacheDel(`sig:${user.email}`);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id  (soft delete)
async function deactivateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await cacheDel(`user:${user._id}`);
    res.json({ message: 'User deactivated', user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, updateUser, syncUser, deactivateUser };
