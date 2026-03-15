const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Azure AD identity
    azureId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },

    // Graph API synced attributes
    displayName: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    department: { type: String, default: '', index: true },
    company: { type: String, default: '' },
    officeLocation: { type: String, default: '' },
    mobilePhone: { type: String, default: '' },
    businessPhone: { type: String, default: '' },
    faxNumber: { type: String, default: '' },
    streetAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    userPrincipalName: { type: String, default: '' },

    // Azure AD groups (synced)
    groups: [{ type: String }],

    // Platform roles
    role: {
      type: String,
      enum: ['admin', 'marketing', 'viewer'],
      default: 'viewer',
    },

    // Assignment overrides (manual override of rule-based assignment)
    assignedTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SignatureTemplate',
      default: null,
    },

    // Business unit assignment (resolved via rules or manual)
    businessUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUnit',
      default: null,
    },

    // Custom user-level attribute overrides
    customAttributes: {
      type: Map,
      of: String,
      default: {},
    },

    // Platform state
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Profile photo URL (synced from Graph or uploaded)
    photoUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: resolved phone (business phone first, fallback to mobile)
userSchema.virtual('phone').get(function () {
  return this.businessPhone || this.mobilePhone || '';
});

// Compound index for rule matching
userSchema.index({ department: 1, businessUnit: 1 });
userSchema.index({ email: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
