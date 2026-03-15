const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    businessUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUnit',
      required: true,
      index: true,
    },

    // Banner asset
    bannerImageUrl: { type: String, required: true },
    bannerAltText: { type: String, default: '' },
    bannerWidth: { type: Number, default: 600 },
    bannerHeight: { type: Number, default: 100 },

    // Click-through redirect
    redirectUrl: { type: String, required: true },

    // UTM tracking params auto-appended to redirectUrl
    utmSource: { type: String, default: 'email-signature' },
    utmMedium: { type: String, default: 'email' },
    utmCampaign: { type: String, default: '' },

    // Schedule
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },

    // Targeting: if empty arrays, applies to ALL users in the BU
    targetDepartments: [{ type: String }],
    targetGroups: [{ type: String }],

    // Analytics counters (updated via atomic $inc)
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired'],
      default: 'draft',
      index: true,
    },

    priority: { type: Number, default: 0 }, // Higher = shown first when multiple campaigns active

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Virtual: is currently active
campaignSchema.virtual('isLive').get(function () {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

// Auto-compute tracking URL with UTM params
campaignSchema.virtual('trackingUrl').get(function () {
  const base = this.redirectUrl;
  const params = new URLSearchParams({
    utm_source: this.utmSource,
    utm_medium: this.utmMedium,
    utm_campaign: this.utmCampaign || this.name.toLowerCase().replace(/\s+/g, '-'),
  });
  return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
});

campaignSchema.set('toJSON', { virtuals: true });

// Status auto-update based on dates
campaignSchema.pre('save', function (next) {
  const now = new Date();
  if (this.status === 'draft') return next();
  if (now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  } else if (now > this.endDate) {
    this.status = 'expired';
  } else if (now < this.startDate) {
    this.status = 'scheduled';
  }
  next();
});

campaignSchema.index({ businessUnit: 1, status: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
