const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },

    type: {
      type: String,
      enum: ['logo', 'banner', 'icon', 'photo', 'qrcode', 'other'],
      required: true,
      index: true,
    },

    // Storage
    url: { type: String, required: true },
    blobName: { type: String, required: true }, // Azure Blob name for deletion
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    // Ownership
    businessUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUnit',
      default: null,
      index: true,
    },

    // Usage tracking
    usedIn: [
      {
        type: { type: String, enum: ['template', 'campaign', 'businessUnit'] },
        refId: { type: mongoose.Schema.Types.ObjectId },
      },
    ],

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

assetSchema.index({ businessUnit: 1, type: 1 });

module.exports = mongoose.model('Asset', assetSchema);
