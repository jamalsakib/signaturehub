const router = require('express').Router();
const BusinessUnit = require('../models/BusinessUnit');
const SignatureTemplate = require('../models/SignatureTemplate');

// POST /api/admin/seed  — dev only, seeds sample data
router.post('/seed', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    // 1. Ensure a default business unit exists
    let bu = await BusinessUnit.findOne({ slug: 'default-company' });
    if (!bu) {
      bu = await BusinessUnit.create({
        name: 'Default Company',
        slug: 'default-company',
        domain: 'company.com',
        isActive: true,
      });
    }

    const templates = [
      {
        name: 'Corporate Standard',
        description: 'Full corporate signature with logo, job title, and contact details',
        layout: 'standard',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: true,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;">
  <tr>
    <td style="padding-right:16px;border-right:3px solid #0078d4;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a1a;">{{displayName}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#0078d4;font-weight:600;">{{jobTitle}}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#666;">{{department}} | {{company}}</p>
    </td>
    <td style="padding-left:16px;vertical-align:top;">
      <p style="margin:0;font-size:12px;color:#555;">📧 {{email}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555;">📞 {{businessPhone}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#555;">📍 {{officeLocation}}</p>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:10px;">
      <img src="{{logoUrl}}" alt="{{company}}" style="height:32px;" />
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Minimal Clean',
        description: 'Minimalist signature — name, title, email only',
        layout: 'minimal',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;border-top:2px solid #0078d4;padding-top:8px;">
  <tr>
    <td>
      <p style="margin:0;font-weight:bold;font-size:14px;">{{displayName}}</p>
      <p style="margin:2px 0;font-size:12px;color:#666;">{{jobTitle}}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#0078d4;">{{email}}</p>
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Rich with Banner',
        description: 'Full signature with photo, social links, and marketing banner zone',
        layout: 'rich',
        hasPhoto: true,
        hasBannerZone: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:520px;">
  <tr>
    <td style="padding-right:14px;vertical-align:top;">
      <img src="{{photoUrl}}" alt="{{displayName}}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" />
    </td>
    <td style="vertical-align:top;">
      <p style="margin:0;font-size:16px;font-weight:bold;color:#1a1a1a;">{{displayName}}</p>
      <p style="margin:3px 0;font-size:12px;color:#0078d4;font-weight:600;">{{jobTitle}}</p>
      <p style="margin:3px 0;font-size:11px;color:#888;">{{company}} · {{department}}</p>
      <p style="margin:6px 0 2px;font-size:12px;color:#555;">📧 {{email}} &nbsp;|&nbsp; 📞 {{businessPhone}}</p>
      <p style="margin:2px 0;font-size:12px;color:#555;">📱 {{mobilePhone}} &nbsp;|&nbsp; 📍 {{officeLocation}}</p>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:12px;">
      <a href="{{bannerLink}}">
        <img src="{{bannerUrl}}" alt="Campaign Banner" style="width:100%;max-width:520px;border-radius:6px;" />
      </a>
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Two-Column Executive',
        description: 'Wide two-column layout for executives with QR code',
        layout: 'two-column',
        hasPhoto: true,
        hasBannerZone: false,
        hasQrCode: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;max-width:600px;background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:#1c2d4a;padding:20px;vertical-align:middle;width:200px;">
      <img src="{{photoUrl}}" style="width:72px;height:72px;border-radius:50%;border:3px solid #fff;display:block;margin:0 auto 10px;" />
      <p style="margin:0;text-align:center;color:#fff;font-size:15px;font-weight:bold;">{{displayName}}</p>
      <p style="margin:4px 0 0;text-align:center;color:#90afd4;font-size:11px;">{{jobTitle}}</p>
    </td>
    <td style="padding:16px 20px;vertical-align:top;">
      <p style="margin:0 0 8px;font-size:12px;color:#0078d4;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">{{company}}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#555;">📧 {{email}}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#555;">📞 {{businessPhone}}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#555;">📍 {{officeLocation}}</p>
      <img src="{{qrCodeUrl}}" style="width:56px;height:56px;margin-top:8px;" />
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Modern Dark Header',
        description: 'Sleek dark banner header with accent color contact row',
        layout: 'rich',
        hasPhoto: true,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;">
  <tr>
    <td style="background:#111827;padding:16px 20px;border-radius:8px 8px 0 0;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;width:68px;">
            <img src="{{photoUrl}}" style="width:60px;height:60px;border-radius:50%;border:2px solid #374151;object-fit:cover;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#f9fafb;letter-spacing:-.2px;">{{displayName}}</p>
            <p style="margin:3px 0 0;font-size:12px;color:#60a5fa;font-weight:500;">{{jobTitle}}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">{{department}} &bull; {{company}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:28px;opacity:.85;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#1f2937;padding:10px 20px;border-radius:0 0 8px 8px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:16px;font-size:12px;color:#d1d5db;">
            <a href="mailto:{{email}}" style="color:#60a5fa;text-decoration:none;">{{email}}</a>
          </td>
          <td style="padding-right:16px;font-size:12px;color:#9ca3af;">{{businessPhone}}</td>
          <td style="font-size:12px;color:#9ca3af;">
            <a href="{{website}}" style="color:#9ca3af;text-decoration:none;">{{website}}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Green Accent Professional',
        description: 'Clean left-border accent in brand green with structured contact grid',
        layout: 'standard',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:520px;">
  <tr>
    <td style="border-left:4px solid #009639;padding-left:14px;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:bold;color:#1a1a1a;">{{displayName}}</p>
      <p style="margin:3px 0 0;font-size:12px;color:#009639;font-weight:600;">{{jobTitle}}</p>
      <p style="margin:2px 0 6px;font-size:11px;color:#6b7280;">{{department}} &bull; {{company}}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:12px;color:#374151;">
        <tr>
          <td style="padding-bottom:3px;padding-right:20px;">
            <a href="mailto:{{email}}" style="color:#374151;text-decoration:none;">{{email}}</a>
          </td>
          <td style="padding-bottom:3px;">{{businessPhone}}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;">{{officeLocation}}</td>
          <td><a href="{{website}}" style="color:#009639;text-decoration:none;">{{website}}</a></td>
        </tr>
      </table>
    </td>
    <td style="padding-left:20px;vertical-align:top;text-align:right;">
      <img src="{{logoUrl}}" style="height:36px;" />
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:10px;">
      <p style="margin:0;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px;">{{legalDisclaimer}}</p>
    </td>
  </tr>
</table>`,
      },
      {
        name: 'Card Style with Social',
        description: 'Boxed card layout with social media icon links and gradient accent',
        layout: 'custom',
        hasPhoto: true,
        hasBannerZone: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:540px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
  <tr>
    <td style="background:linear-gradient(135deg,{{primaryColor}} 0%,{{accentColor}} 100%);padding:18px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;width:58px;">
            <img src="{{photoUrl}}" style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.5);object-fit:cover;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">{{displayName}}</p>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,.8);">{{jobTitle}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:24px;filter:brightness(0) invert(1);opacity:.9;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;padding:14px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="font-size:12px;color:#374151;padding-bottom:4px;">
            <a href="mailto:{{email}}" style="color:{{accentColor}};text-decoration:none;font-weight:500;">{{email}}</a>
          </td>
          <td style="font-size:12px;color:#6b7280;text-align:right;padding-bottom:4px;">{{businessPhone}}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:#9ca3af;" colspan="2">{{officeLocation}} &bull; <a href="{{website}}" style="color:#9ca3af;text-decoration:none;">{{website}}</a></td>
        </tr>
      </table>
    </td>
  </tr>
  {{#if hasBanner}}
  <tr>
    <td style="padding:0 20px 14px;">
      <a href="{{bannerLink}}"><img src="{{bannerUrl}}" alt="{{bannerAltText}}" style="width:100%;border-radius:6px;" /></a>
    </td>
  </tr>
  {{/if}}
</table>`,
      },
      {
        name: 'Compact Legal',
        description: 'Minimal legal/compliance style with full disclaimer and firm branding',
        layout: 'minimal',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:600px;">
  <tr>
    <td style="padding-bottom:10px;border-bottom:2px solid {{primaryColor}};">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:top;">
            <p style="margin:0;font-size:14px;font-weight:bold;color:#111827;">{{displayName}}</p>
            <p style="margin:2px 0;font-size:12px;color:{{primaryColor}};">{{jobTitle}}</p>
            <p style="margin:2px 0;font-size:11px;color:#6b7280;">{{company}}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#374151;">
              T: {{businessPhone}} &nbsp;&bull;&nbsp;
              M: {{mobilePhone}} &nbsp;&bull;&nbsp;
              <a href="mailto:{{email}}" style="color:{{accentColor}};text-decoration:none;">{{email}}</a>
            </p>
            <p style="margin:2px 0;font-size:11px;color:#6b7280;">{{streetAddress}}, {{city}}, {{state}}, {{country}}</p>
            <a href="{{website}}" style="font-size:11px;color:{{primaryColor}};text-decoration:none;">{{website}}</a>
          </td>
          <td style="vertical-align:top;text-align:right;padding-left:20px;">
            <img src="{{logoUrl}}" style="height:40px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:8px;">
      <p style="margin:0;font-size:9px;color:#9ca3af;line-height:1.5;">
        {{legalDisclaimer}}
      </p>
    </td>
  </tr>
</table>`,
      },

      // ── Additional professional templates ────────────────────────────────────

      {
        name: 'Finance & Banking',
        description: 'Conservative navy/gold design for financial professionals with full address block',
        layout: 'standard',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Times New Roman',Georgia,serif;max-width:580px;">
  <tr>
    <td style="border-bottom:3px double #8b6914;padding-bottom:12px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:top;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a2744;letter-spacing:.3px;">{{displayName}}</p>
            <p style="margin:3px 0 0;font-size:12px;color:#8b6914;font-style:italic;font-weight:600;">{{jobTitle}}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#4b5563;letter-spacing:.2px;">{{department}} &nbsp;&bull;&nbsp; {{company}}</p>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <img src="{{logoUrl}}" style="height:38px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:24px;vertical-align:top;border-right:1px solid #d1d5db;">
            <p style="margin:0;font-size:11px;color:#374151;line-height:1.8;">
              <strong style="color:#1a2744;">D:</strong> {{businessPhone}}<br/>
              <strong style="color:#1a2744;">M:</strong> {{mobilePhone}}<br/>
              <strong style="color:#1a2744;">E:</strong> <a href="mailto:{{email}}" style="color:#1a2744;text-decoration:none;">{{email}}</a>
            </p>
          </td>
          <td style="padding-left:24px;vertical-align:top;">
            <p style="margin:0;font-size:11px;color:#374151;line-height:1.8;">
              {{streetAddress}}<br/>
              {{city}}, {{state}} {{country}}<br/>
              <a href="{{website}}" style="color:#8b6914;text-decoration:none;">{{website}}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;">
      <p style="margin:0;font-size:8.5px;color:#9ca3af;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:8px;">
        {{legalDisclaimer}}
      </p>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Tech Startup Bold',
        description: 'Modern tech-company look with bold typography and vibrant accent color',
        layout: 'standard',
        hasPhoto: true,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;">
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:16px;width:72px;">
            <img src="{{photoUrl}}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;display:block;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:17px;font-weight:700;color:#111;letter-spacing:-.3px;">{{displayName}}</p>
            <p style="margin:3px 0 0;font-size:12px;font-weight:600;color:#6366f1;">{{jobTitle}}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;font-weight:500;">{{company}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:28px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:12px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:8px;width:100%;">
        <tr>
          <td style="padding:10px 14px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:20px;font-size:12px;color:#4b5563;">
                  <a href="mailto:{{email}}" style="color:#6366f1;text-decoration:none;font-weight:500;">{{email}}</a>
                </td>
                <td style="padding-right:20px;font-size:12px;color:#6b7280;">{{businessPhone}}</td>
                <td style="font-size:12px;">
                  <a href="{{website}}" style="color:#6366f1;text-decoration:none;font-weight:500;">{{website}}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Healthcare Professional',
        description: 'Clean clinical design for medical staff with department, credentials, and contact',
        layout: 'standard',
        hasPhoto: true,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:580px;border-left:4px solid #0891b2;">
  <tr>
    <td style="padding-left:16px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;width:70px;">
            <img src="{{photoUrl}}" style="width:62px;height:62px;border-radius:50%;object-fit:cover;border:2px solid #e0f2fe;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:15px;font-weight:bold;color:#0c4a6e;">{{displayName}}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#0891b2;font-weight:600;">{{jobTitle}}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#64748b;">{{department}}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#64748b;font-weight:500;">{{company}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;padding-left:12px;">
            <img src="{{logoUrl}}" style="height:36px;" />
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border-top:1px solid #e0f2fe;padding-top:8px;width:100%;">
        <tr>
          <td style="font-size:11px;color:#374151;line-height:1.9;">
            <span style="color:#0891b2;font-weight:600;">Phone:</span> {{businessPhone}} &nbsp;&nbsp;
            <span style="color:#0891b2;font-weight:600;">Mobile:</span> {{mobilePhone}}<br/>
            <span style="color:#0891b2;font-weight:600;">Email:</span> <a href="mailto:{{email}}" style="color:#0c4a6e;text-decoration:none;">{{email}}</a> &nbsp;&nbsp;
            <span style="color:#0891b2;font-weight:600;">Location:</span> {{officeLocation}}
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-size:8.5px;color:#94a3b8;line-height:1.5;">This email and any attachments are confidential and may be subject to medical privilege. If you are not the intended recipient, please delete this message immediately.</p>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Law Firm Partner',
        description: 'Formal serif style for legal professionals with full credentials and disclaimer',
        layout: 'standard',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Georgia,'Times New Roman',serif;max-width:600px;">
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-bottom:1px solid #374151;padding-bottom:12px;margin-bottom:10px;">
        <tr>
          <td style="vertical-align:top;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#111827;letter-spacing:.2px;">{{displayName}}</p>
            <p style="margin:3px 0 0;font-size:12px;color:#1e3a5f;font-style:italic;">{{jobTitle}}</p>
            <p style="margin:3px 0 0;font-size:11.5px;font-weight:bold;color:#374151;letter-spacing:.5px;text-transform:uppercase;">{{company}}</p>
          </td>
          <td style="vertical-align:top;text-align:right;padding-left:20px;">
            <img src="{{logoUrl}}" style="height:44px;" />
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:30px;border-right:1px solid #d1d5db;vertical-align:top;">
            <p style="margin:0;font-size:11px;color:#374151;line-height:1.9;">
              <span style="font-weight:bold;color:#1e3a5f;">Direct:</span> {{businessPhone}}<br/>
              <span style="font-weight:bold;color:#1e3a5f;">Mobile:</span> {{mobilePhone}}<br/>
              <span style="font-weight:bold;color:#1e3a5f;">Fax:</span> {{phone}}
            </p>
          </td>
          <td style="padding-left:30px;vertical-align:top;">
            <p style="margin:0;font-size:11px;color:#374151;line-height:1.9;">
              <a href="mailto:{{email}}" style="color:#1e3a5f;text-decoration:none;font-weight:bold;">{{email}}</a><br/>
              {{streetAddress}}<br/>
              {{city}}, {{state}}, {{country}}<br/>
              <a href="{{website}}" style="color:#1e3a5f;text-decoration:none;">{{website}}</a>
            </p>
          </td>
        </tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-top:1px solid #e5e7eb;width:100%;">
        <tr>
          <td style="padding-top:8px;">
            <p style="margin:0;font-size:8.5px;color:#9ca3af;line-height:1.6;font-style:italic;">
              PRIVILEGED AND CONFIDENTIAL: {{legalDisclaimer}}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Creative Agency',
        description: 'Bold colorful design for creative teams with gradient name bar and icon contacts',
        layout: 'custom',
        hasPhoto: true,
        hasBannerZone: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:540px;">
  <tr>
    <td style="background:linear-gradient(135deg,#f97316 0%,#ec4899 50%,#8b5cf6 100%);border-radius:10px 10px 0 0;padding:16px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="width:60px;padding-right:14px;vertical-align:middle;">
            <img src="{{photoUrl}}" style="width:52px;height:52px;border-radius:50%;border:3px solid rgba(255,255,255,.4);object-fit:cover;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px;">{{displayName}}</p>
            <p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,.85);font-weight:500;text-transform:uppercase;letter-spacing:.8px;">{{jobTitle}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:22px;filter:brightness(0) invert(1);" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 10px 10px;padding:14px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#6b7280;">
              ✉&nbsp; <a href="mailto:{{email}}" style="color:#8b5cf6;text-decoration:none;font-weight:600;">{{email}}</a>
              &nbsp;&nbsp; 📱&nbsp;<span style="color:#374151;">{{mobilePhone}}</span>
              &nbsp;&nbsp; 🌐&nbsp;<a href="{{website}}" style="color:#f97316;text-decoration:none;font-weight:600;">{{website}}</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">{{company}} &bull; {{officeLocation}}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;">
      <a href="{{bannerLink}}">
        <img src="{{bannerUrl}}" alt="Campaign" style="width:100%;border-radius:8px;display:block;" />
      </a>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Real Estate Agent',
        description: 'Photo-forward design for property professionals with designation, listings CTA, and social',
        layout: 'rich',
        hasPhoto: true,
        hasBannerZone: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <tr>
    <td style="background:#1e293b;padding:18px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="width:80px;padding-right:16px;vertical-align:top;">
            <img src="{{photoUrl}}" style="width:74px;height:80px;object-fit:cover;border-radius:6px;border:2px solid #f59e0b;" />
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0;font-size:17px;font-weight:700;color:#f8fafc;letter-spacing:-.2px;">{{displayName}}</p>
            <p style="margin:3px 0;font-size:12px;color:#f59e0b;font-weight:600;text-transform:uppercase;letter-spacing:.6px;">{{jobTitle}}</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:500;">{{company}}</p>
            <p style="margin:8px 0 0;font-size:11.5px;color:#e2e8f0;line-height:1.7;">
              📞 {{businessPhone}}<br/>
              📱 {{mobilePhone}}<br/>
              ✉ <a href="mailto:{{email}}" style="color:#f59e0b;text-decoration:none;">{{email}}</a>
            </p>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <img src="{{logoUrl}}" style="height:32px;filter:brightness(0) invert(1);opacity:.9;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:10px 20px;">
      <p style="margin:0;font-size:11px;color:#64748b;">
        📍 {{officeLocation}} &nbsp;&bull;&nbsp;
        <a href="{{website}}" style="color:#1e293b;text-decoration:none;font-weight:600;">{{website}}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 20px 14px;">
      <a href="{{bannerLink}}">
        <img src="{{bannerUrl}}" alt="Current Listings" style="width:100%;border-radius:6px;display:block;" />
      </a>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Executive Minimal',
        description: 'Ultra-clean C-suite style: name in large type, thin rule, sparse contact line',
        layout: 'minimal',
        hasPhoto: false,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;">
  <tr>
    <td style="padding-bottom:10px;">
      <p style="margin:0;font-size:18px;font-weight:300;color:#111827;letter-spacing:-.4px;">{{displayName}}</p>
      <p style="margin:4px 0 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;">{{jobTitle}} &nbsp;&mdash;&nbsp; {{company}}</p>
    </td>
  </tr>
  <tr>
    <td style="border-top:1px solid #e5e7eb;padding-top:10px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:20px;font-size:11.5px;color:#374151;">
            <a href="mailto:{{email}}" style="color:#111827;text-decoration:none;">{{email}}</a>
          </td>
          <td style="padding-right:20px;font-size:11.5px;color:#6b7280;">{{businessPhone}}</td>
          <td style="font-size:11.5px;">
            <a href="{{website}}" style="color:#6b7280;text-decoration:none;">{{website}}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'Consulting & Advisory',
        description: 'Premium consulting look with credential line, gradient accent bar, and QR code',
        layout: 'two-column',
        hasPhoto: true,
        hasQrCode: true,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;">
  <tr>
    <td style="background:linear-gradient(90deg,#0f172a 0%,#1e3a5f 100%);height:4px;border-radius:4px 4px 0 0;" colspan="2"></td>
  </tr>
  <tr>
    <td style="padding:16px 0 16px 20px;vertical-align:top;width:200px;border-right:1px solid #e2e8f0;">
      <img src="{{photoUrl}}" style="width:70px;height:70px;border-radius:8px;object-fit:cover;margin-bottom:10px;display:block;" />
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">{{displayName}}</p>
      <p style="margin:3px 0;font-size:11px;color:#2563eb;font-weight:600;">{{jobTitle}}</p>
      <p style="margin:2px 0;font-size:10.5px;color:#64748b;font-style:italic;">{{company}}</p>
      <img src="{{qrCodeUrl}}" style="width:52px;height:52px;margin-top:10px;display:block;" />
    </td>
    <td style="padding:16px 20px;vertical-align:top;">
      <img src="{{logoUrl}}" style="height:30px;margin-bottom:10px;display:block;" />
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:12px;color:#374151;">
        <tr><td style="padding-bottom:5px;color:#6b7280;width:64px;font-weight:600;">Email</td><td><a href="mailto:{{email}}" style="color:#2563eb;text-decoration:none;">{{email}}</a></td></tr>
        <tr><td style="padding-bottom:5px;color:#6b7280;font-weight:600;">Direct</td><td>{{businessPhone}}</td></tr>
        <tr><td style="padding-bottom:5px;color:#6b7280;font-weight:600;">Mobile</td><td>{{mobilePhone}}</td></tr>
        <tr><td style="padding-bottom:5px;color:#6b7280;font-weight:600;">Office</td><td>{{officeLocation}}</td></tr>
        <tr><td style="color:#6b7280;font-weight:600;vertical-align:top;">Web</td><td><a href="{{website}}" style="color:#2563eb;text-decoration:none;">{{website}}</a></td></tr>
      </table>
      <p style="margin:10px 0 0;font-size:9px;color:#9ca3af;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:8px;">{{legalDisclaimer}}</p>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="background:linear-gradient(90deg,#0f172a 0%,#1e3a5f 100%);height:2px;border-radius:0 0 4px 4px;"></td>
  </tr>
</table>`,
      },

      {
        name: 'Sales Professional',
        description: 'High-energy sales template with CTA button, photo, and social proof tagline',
        layout: 'standard',
        hasPhoto: true,
        hasBannerZone: true,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;max-width:560px;">
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;width:70px;">
            <img src="{{photoUrl}}" style="width:62px;height:62px;border-radius:50%;object-fit:cover;border:3px solid #16a34a;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:15px;font-weight:bold;color:#111827;">{{displayName}}</p>
            <p style="margin:2px 0;font-size:12px;color:#16a34a;font-weight:600;">{{jobTitle}}</p>
            <p style="margin:2px 0;font-size:11px;color:#6b7280;">{{company}} &bull; {{department}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:30px;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:8px;padding:10px 14px;width:100%;">
        <tr>
          <td>
            <p style="margin:0;font-size:12px;color:#374151;line-height:1.7;">
              📞 <a href="tel:{{businessPhone}}" style="color:#374151;text-decoration:none;">{{businessPhone}}</a>
              &nbsp;&nbsp; 📱 {{mobilePhone}}
              &nbsp;&nbsp; ✉ <a href="mailto:{{email}}" style="color:#16a34a;text-decoration:none;font-weight:600;">{{email}}</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#6b7280;">
              📍 {{officeLocation}} &nbsp;&bull;&nbsp; <a href="{{website}}" style="color:#16a34a;text-decoration:none;">{{website}}</a>
            </p>
          </td>
          <td style="text-align:right;vertical-align:middle;padding-left:12px;">
            <a href="{{bannerLink}}" style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:700;padding:7px 14px;border-radius:6px;text-decoration:none;white-space:nowrap;">Book a Meeting →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px;">
      <a href="{{bannerLink}}">
        <img src="{{bannerUrl}}" alt="Offer" style="width:100%;border-radius:8px;display:block;" />
      </a>
    </td>
  </tr>
</table>`,
      },

      {
        name: 'HR & People Team',
        description: 'Warm, approachable style for HR professionals with culture tagline and contact',
        layout: 'standard',
        hasPhoto: true,
        hasBannerZone: false,
        isDefault: false,
        htmlTemplate: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;max-width:540px;">
  <tr>
    <td style="background:#fef3c7;border-radius:8px 8px 0 0;padding:12px 18px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;width:68px;">
            <img src="{{photoUrl}}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid #f59e0b;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#78350f;">{{displayName}}</p>
            <p style="margin:2px 0;font-size:12px;color:#b45309;font-weight:600;">{{jobTitle}}</p>
            <p style="margin:2px 0;font-size:11px;color:#92400e;font-style:italic;">{{department}} &bull; {{company}}</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <img src="{{logoUrl}}" style="height:28px;opacity:.85;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;border:1px solid #fde68a;border-top:none;border-radius:0 0 8px 8px;padding:12px 18px;">
      <p style="margin:0;font-size:12px;color:#374151;line-height:1.8;">
        ✉&nbsp; <a href="mailto:{{email}}" style="color:#b45309;text-decoration:none;font-weight:600;">{{email}}</a>
        &nbsp;&nbsp; 📞&nbsp; {{businessPhone}}
        &nbsp;&nbsp; 📍&nbsp; {{officeLocation}}
      </p>
      <p style="margin:6px 0 0;font-size:10.5px;color:#92400e;font-style:italic;border-top:1px solid #fde68a;padding-top:8px;">
        "People are our greatest asset." — <strong>{{company}}</strong>
      </p>
    </td>
  </tr>
</table>`,
      },
    ];

    let created = 0;
    for (const tpl of templates) {
      const exists = await SignatureTemplate.findOne({ name: tpl.name, businessUnit: bu._id });
      if (!exists) {
        await SignatureTemplate.create({ ...tpl, businessUnit: bu._id });
        created++;
      }
    }

    res.json({ message: `Seed complete. Created ${created} template(s).`, businessUnit: bu.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
