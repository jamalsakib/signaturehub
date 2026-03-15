const Handlebars = require('handlebars');
const QRCode = require('qrcode');
const SignatureTemplate = require('../models/SignatureTemplate');
const Campaign = require('../models/Campaign');
const Rule = require('../models/Rule');
const { evaluateRules } = require('./ruleEngine');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

// Register Handlebars helpers
Handlebars.registerHelper('ifTruthy', (value, options) =>
  value ? options.fn(this) : options.inverse(this)
);

/**
 * Find the active campaign for a user's business unit (highest priority first).
 */
async function getActiveCampaign(businessUnitId, user) {
  const now = new Date();
  const query = {
    businessUnit: businessUnitId,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  };

  // Targeting filters
  if (user.department) {
    query.$or = [
      { targetDepartments: { $size: 0 } },
      { targetDepartments: user.department },
    ];
  }

  return Campaign.findOne(query).sort({ priority: -1 });
}

/**
 * Build the template data object from user + business unit + campaign.
 */
async function buildTemplateData(user, businessUnit, campaign) {
  const data = {
    // User fields
    displayName: user.displayName || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    jobTitle: user.jobTitle || '',
    department: user.department || '',
    company: user.company || businessUnit?.name || '',
    email: user.email || '',
    phone: user.phone || user.businessPhone || user.mobilePhone || '',
    mobilePhone: user.mobilePhone || '',
    businessPhone: user.businessPhone || '',
    officeLocation: user.officeLocation || '',
    streetAddress: user.streetAddress || '',
    city: user.city || '',
    state: user.state || '',
    country: user.country || '',
    photoUrl: user.photoUrl || '',

    // Business unit branding
    website: businessUnit?.website || '',
    logoUrl: businessUnit?.branding?.logoUrl || '',
    primaryColor: businessUnit?.branding?.primaryColor || '#000000',
    secondaryColor: businessUnit?.branding?.secondaryColor || '#ffffff',
    legalDisclaimer: businessUnit?.legalDisclaimer || '',
    socialLinks: businessUnit?.socialLinks || [],

    // Campaign / banner
    bannerUrl: campaign?.bannerImageUrl || '',
    bannerLink: campaign ? buildTrackingUrl(campaign) : '',
    bannerAltText: campaign?.bannerAltText || '',

    // Custom user attributes
    ...(user.customAttributes ? Object.fromEntries(user.customAttributes) : {}),
  };

  // QR code for mobile phone
  if (user.mobilePhone || user.businessPhone) {
    const vcardPhone = user.mobilePhone || user.businessPhone;
    try {
      data.qrCodeUrl = await QRCode.toDataURL(
        `BEGIN:VCARD\nVERSION:3.0\nFN:${data.displayName}\nTEL:${vcardPhone}\nEMAIL:${data.email}\nEND:VCARD`,
        { width: 100, margin: 1 }
      );
    } catch {
      data.qrCodeUrl = '';
    }
  } else {
    data.qrCodeUrl = '';
  }

  return data;
}

function buildTrackingUrl(campaign) {
  const base = campaign.redirectUrl;
  const params = new URLSearchParams({
    utm_source: campaign.utmSource || 'email-signature',
    utm_medium: campaign.utmMedium || 'email',
    utm_campaign: campaign.utmCampaign || campaign.name.toLowerCase().replace(/\s+/g, '-'),
    cid: campaign._id.toString(),
  });
  return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
}

/**
 * Render a signature HTML string for a given user.
 * Resolves template via: user.assignedTemplate → rules → BU defaultTemplate.
 */
async function renderSignatureForUser(user, businessUnit) {
  const cacheKey = `sig:${user._id || user.azureId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  // Resolve template
  let template = null;
  if (user.assignedTemplate) {
    template = await SignatureTemplate.findById(user.assignedTemplate).lean();
  }

  if (!template) {
    const rules = await Rule.find({ isActive: true })
      .sort({ priority: 1 })
      .populate('assignTemplate assignBusinessUnit')
      .lean();
    const result = evaluateRules(rules, user);
    if (result.template) {
      template = result.template;
      if (!businessUnit && result.businessUnit) businessUnit = result.businessUnit;
    }
  }

  if (!template && businessUnit?.defaultTemplate) {
    template = await SignatureTemplate.findById(businessUnit.defaultTemplate).lean();
  }

  if (!template) {
    logger.warn(`No signature template found for user ${user.email}`);
    return { html: '', plainText: '' };
  }

  const campaign = businessUnit
    ? await getActiveCampaign(businessUnit._id, user)
    : null;

  const data = await buildTemplateData(user, businessUnit, campaign);

  // Track impression
  if (campaign) {
    Campaign.updateOne({ _id: campaign._id }, { $inc: { impressions: 1 } }).catch(() => {});
  }

  const compiledHtml = Handlebars.compile(template.htmlTemplate);
  const compiledText = template.plainTextTemplate
    ? Handlebars.compile(template.plainTextTemplate)
    : null;

  const result = {
    html: compiledHtml(data),
    plainText: compiledText ? compiledText(data) : '',
    templateId: template._id,
    campaignId: campaign?._id || null,
  };

  await cacheSet(cacheKey, result, 600); // Cache for 10 minutes
  return result;
}

/**
 * Render a preview for a template + mock user data (admin use).
 */
async function renderPreview(templateId, mockData = {}) {
  const template = await SignatureTemplate.findById(templateId).populate('businessUnit').lean();
  if (!template) throw Object.assign(new Error('Template not found'), { status: 404 });

  const data = {
    displayName: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    jobTitle: 'Senior Manager',
    department: 'Marketing',
    company: template.businessUnit?.name || 'Acme Corp',
    email: 'jane.smith@example.com',
    phone: '+1 555 000 0000',
    mobilePhone: '+1 555 000 0001',
    businessPhone: '+1 555 000 0000',
    officeLocation: 'New York',
    website: template.businessUnit?.website || 'https://example.com',
    logoUrl: template.businessUnit?.branding?.logoUrl || '',
    primaryColor: template.businessUnit?.branding?.primaryColor || '#0078d4',
    secondaryColor: template.businessUnit?.branding?.secondaryColor || '#ffffff',
    legalDisclaimer: template.businessUnit?.legalDisclaimer || '',
    bannerUrl: '',
    bannerLink: '',
    qrCodeUrl: '',
    socialLinks: template.businessUnit?.socialLinks || [],
    ...mockData,
  };

  const compiledHtml = Handlebars.compile(template.htmlTemplate);
  return {
    html: compiledHtml(data),
    plainText: template.plainTextTemplate
      ? Handlebars.compile(template.plainTextTemplate)(data)
      : '',
  };
}

module.exports = { renderSignatureForUser, renderPreview, buildTemplateData };
