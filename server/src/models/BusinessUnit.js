const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'website', 'custom'],
    required: true,
  },
  url: { type: String, required: true },
  label: { type: String, default: '' },
  iconUrl: { type: String, default: null },
}, { _id: false });

const businessUnitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },

    // Branding
    branding: {
      primaryColor: { type: String, default: '#000000' },
      secondaryColor: { type: String, default: '#ffffff' },
      accentColor: { type: String, default: '#0078d4' },
      fontFamily: { type: String, default: 'Arial, sans-serif' },
      logoUrl: { type: String, default: null },
      logoAltText: { type: String, default: '' },
      logoWidth: { type: Number, default: 150 },
      logoHeight: { type: Number, default: 50 },
    },

    // Contact/legal defaults
    website: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    legalDisclaimer: { type: String, default: '' },

    // Social media
    socialLinks: [socialLinkSchema],

    // Default template for this BU
    defaultTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SignatureTemplate',
      default: null,
    },

    // Email domain patterns associated with this BU
    emailDomains: [{ type: String, lowercase: true }],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

businessUnitSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('BusinessUnit', businessUnitSchema);
