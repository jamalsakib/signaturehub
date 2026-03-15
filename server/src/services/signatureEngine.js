const Handlebars = require('handlebars');
const QRCode = require('qrcode');
const User = require('../models/User');
const SignatureTemplate = require('../models/SignatureTemplate');
const BusinessUnit = require('../models/BusinessUnit');
const Campaign = require('../models/Campaign');
const Rule = require('../models/Rule');
const { evaluateRules } = require('./ruleEngine');
const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

// Register Handlebars helpers
Handlebars.registerHelper('ifEmpty', (value, fallback) => value || fallback || '');
Handlebars.registerHelper('formatPhone', (phone) => phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : '');
Handlebars.registerHelper('lowercase', (str) => (str || '').toLowerCase());

/**
 * Main entry point: resolve and render the signature HTML for a user.
 * @param {string} userEmail - user's email or azureId
 * @param {Object} options - { preview: bool, campaignId: string }
 */
async function generateSignatureForUser(userEmailOrId, options = {}) {
  const cacheKey = `sig:${userEmailOrId}`;

  if (!options.preview) {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
  }

  // 1. Load user
  const user = await User.findOne({
    $or: [{ email: userEmailOrId.toLowerCase() }, { azureId: userEmailOrId }],
    isActive: true,
  })
    .populate('assignedTemplate')
    .populate('businessUnit')
    .lean();

  if (!user) throw new Error(`User not found: ${userEmailOrId}`);

  // 2. Resolve template (manual override > rule engine > BU default)
  let template = user.assignedTemplate;
  let businessUnit = user.businessUnit;

  if (!template) {
    const rules = await Rule.find({ isActive: true })
      .sort({ priority: 1 })
      .populate('assignTemplate assignBusinessUnit')
      .lean();
    const result = evaluateRules(rules, user);
    template = result.template;
    if (!businessUnit && result.businessUnit) businessUnit = result.businessUnit;
  }

  // Fallback to BU default template
  if (!template && businessUnit) {
    const bu = await BusinessUnit.findById(businessUnit._id || businessUnit)
      .populate('defaultTemplate')
      .lean();
    template = bu?.defaultTemplate;
    businessUnit = bu;
  }

  if (!template) {
    // Last resort: use first available template
    template = await SignatureTemplate.findOne({ isActive: true }).lean();
  }

  if (!template) throw new Error('No signature template available for user');

  // 3. Resolve active campaign banner
  const banner = await getActiveCampaign(
    businessUnit?._id || businessUnit,
    user.department,
    user.groups
  );

  // 4. Build QR code if template uses it
  let qrCodeUrl = null;
  if (template.hasQrCode) {
    const qrTarget = businessUnit?.website || `mailto:${user.email}`;
    qrCodeUrl = await QRCode.toDataURL(qrTarget, { width: 80, margin: 1 });
  }

  // 5. Build template context
  const buData = businessUnit || {};
  const context = {
    // User attributes
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    jobTitle: user.jobTitle,
    department: user.department,
    company: user.company || buData.name || '',
    email: user.email,
    phone: user.businessPhone || user.mobilePhone || '',
    mobilePhone: user.mobilePhone,
    businessPhone: user.businessPhone,
    officeLocation: user.officeLocation,
    streetAddress: user.streetAddress,
    city: user.city,
    state: user.state,
    country: user.country,
    photoUrl: user.photoUrl || '',

    // Business unit branding
    website: buData.website || '',
    logoUrl: buData.branding?.logoUrl || '',
    logoAltText: buData.branding?.logoAltText || buData.name || '',
    logoWidth: buData.branding?.logoWidth || 150,
    logoHeight: buData.branding?.logoHeight || 50,
    primaryColor: buData.branding?.primaryColor || '#000000',
    accentColor: buData.branding?.accentColor || '#0078d4',
    legalDisclaimer: buData.legalDisclaimer || '',

    // Campaign banner
    bannerUrl: banner?.bannerImageUrl || '',
    bannerLink: banner ? buildBannerLink(banner, user) : '',
    bannerAltText: banner?.bannerAltText || '',
    bannerWidth: banner?.bannerWidth || 600,
    hasBanner: !!banner,

    // QR code
    qrCodeUrl: qrCodeUrl || '',

    // Social links
    socialLinks: buData.socialLinks || [],

    // Custom user attributes
    ...(user.customAttributes || {}),
  };

  // 6. Compile and render the Handlebars template
  const compiled = Handlebars.compile(template.htmlTemplate, { noEscape: true });
  const html = compiled(context);

  const plainText = template.plainTextTemplate
    ? Handlebars.compile(template.plainTextTemplate)(context)
    : stripHtml(html);

  const result = {
    html,
    plainText,
    templateId: template._id,
    templateName: template.name,
    businessUnitId: businessUnit?._id,
    bannerId: banner?._id || null,
    userId: user._id,
  };

  if (!options.preview) {
    await cacheSet(cacheKey, result, 300); // cache 5 min
  }

  return result;
}

async function getActiveCampaign(businessUnitId, department, groups) {
  if (!businessUnitId) return null;

  const now = new Date();
  const campaigns = await Campaign.find({
    businessUnit: businessUnitId,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ priority: -1 })
    .lean();

  for (const campaign of campaigns) {
    const deptMatch =
      !campaign.targetDepartments?.length ||
      campaign.targetDepartments.some(
        (d) => d.toLowerCase() === (department || '').toLowerCase()
      );

    const groupMatch =
      !campaign.targetGroups?.length ||
      (groups || []).some((g) =>
        campaign.targetGroups.map((tg) => tg.toLowerCase()).includes(g.toLowerCase())
      );

    if (deptMatch && groupMatch) return campaign;
  }

  return null;
}

function buildBannerLink(campaign, user) {
  const params = new URLSearchParams({
    utm_source: campaign.utmSource || 'email-signature',
    utm_medium: campaign.utmMedium || 'email',
    utm_campaign: campaign.utmCampaign || campaign.name.toLowerCase().replace(/\s+/g, '-'),
    sig_uid: user._id?.toString() || '',
    sig_cid: campaign._id?.toString() || '',
  });
  const base = campaign.redirectUrl || '#';
  return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Preview: render signature with custom attribute overrides (no cache)
 */
async function previewSignature(templateId, overrides = {}, htmlTemplateOverride = null) {
  const template = await SignatureTemplate.findById(templateId).lean();
  if (!template) throw new Error('Template not found');

  const bu = await BusinessUnit.findById(template.businessUnit).lean();

  const defaultContext = {
    displayName: 'Jane Smith',
    firstName: 'Jane',
    lastName: 'Smith',
    jobTitle: 'Senior Manager',
    department: bu?.name || 'Department',
    company: bu?.name || 'Company Name',
    email: 'jane.smith@company.com',
    phone: '+1 (555) 123-4567',
    mobilePhone: '+1 (555) 987-6543',
    businessPhone: '+1 (555) 123-4567',
    officeLocation: 'New York, NY',
    website: bu?.website || 'https://company.com',
    logoUrl: bu?.branding?.logoUrl || '',
    logoAltText: bu?.branding?.logoAltText || bu?.name || 'Company',
    logoWidth: bu?.branding?.logoWidth || 150,
    logoHeight: bu?.branding?.logoHeight || 50,
    primaryColor: bu?.branding?.primaryColor || '#000000',
    accentColor: bu?.branding?.accentColor || '#0078d4',
    legalDisclaimer: bu?.legalDisclaimer || '',
    bannerUrl: '',
    bannerLink: '#',
    bannerAltText: '',
    hasBanner: false,
    qrCodeUrl: '',
    socialLinks: bu?.socialLinks || [],
    ...overrides,
  };

  const compiled = Handlebars.compile(htmlTemplateOverride || template.htmlTemplate, { noEscape: true });
  return { html: compiled(defaultContext), templateId, templateName: template.name };
}

module.exports = { generateSignatureForUser, previewSignature, getActiveCampaign };
