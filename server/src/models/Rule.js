const mongoose = require('mongoose');

// A condition is: field operator value
const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: ['department', 'company', 'emailDomain', 'group', 'jobTitle', 'officeLocation', 'country'],
  },
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'contains', 'startsWith', 'endsWith', 'in', 'notEquals'],
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // string or string[]
}, { _id: false });

const ruleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Rule evaluation: ALL conditions must match (AND) or ANY (OR)
    logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },

    conditions: {
      type: [conditionSchema],
      validate: [(v) => v.length > 0, 'At least one condition is required'],
    },

    // What to assign when rule matches
    assignTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SignatureTemplate',
      required: true,
    },

    assignBusinessUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessUnit',
      default: null,
    },

    // Priority: lower number = evaluated first; first match wins
    priority: { type: Number, default: 100, index: true },

    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ruleSchema.index({ priority: 1, isActive: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
