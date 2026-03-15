const multer = require('multer');
const { uploadAsset, deleteAsset } = require('../services/storageService');
const Asset = require('../models/Asset');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// GET /api/assets
async function listAssets(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.businessUnit) filter.businessUnit = req.query.businessUnit;

    const assets = await Asset.find(filter)
      .populate('businessUnit', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(assets);
  } catch (err) {
    next(err);
  }
}

// POST /api/assets  (multipart/form-data)
async function uploadAssetHandler(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { type = 'other', businessUnit } = req.body;

    const asset = await uploadAsset({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      type,
      businessUnitId: businessUnit || null,
      uploadedBy: req.user._id,
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/assets/:id
async function deleteAssetHandler(req, res, next) {
  try {
    const asset = await deleteAsset(req.params.id);
    res.json({ message: 'Asset deleted', asset });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAssets, uploadAssetHandler, deleteAssetHandler, upload };
