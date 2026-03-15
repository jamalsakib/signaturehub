const mongoose = require('mongoose');

// Tracks banner click-through events for analytics
const clickEventSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Request metadata
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    referer: { type: String, default: '' },

    // Geo (populated by GeoIP service if configured)
    country: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  {
    timestamps: true,
    // TTL: auto-delete events older than 2 years
    expireAfterSeconds: 60 * 60 * 24 * 730,
  }
);

clickEventSchema.index({ campaign: 1, createdAt: -1 });
clickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('ClickEvent', clickEventSchema);
