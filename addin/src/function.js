/*
 * SignatureHub Outlook Add-in — Function File
 * Handles auto-run events and the ribbon "Insert Signature" button.
 *
 * Requirements: Office.js Mailbox 1.3+
 * Auto-run (OnNewMessageCompose): Mailbox 1.10+
 */

'use strict';

const API_BASE = 'https://your-signaturehub-domain.com/api';
const API_KEY  = 'YOUR_ADDIN_API_KEY'; // Set via environment at build time

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchSignature(email) {
  const url = `${API_BASE}/signatures/generate?email=${encodeURIComponent(email)}`;
  const resp = await fetch(url, {
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  });

  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json(); // { html, plainText, bannerId, ... }
}

function getMailboxEmail() {
  return Office.context.mailbox?.userProfile?.emailAddress || '';
}

// Set the body of the compose item to include the signature at the bottom.
// Uses coercionType Html to preserve formatting.
async function setSignatureInBody(item, signatureData) {
  return new Promise((resolve, reject) => {
    item.body.getAsync(Office.CoercionType.Html, (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        return reject(result.error);
      }

      const existingBody = result.value || '';

      // Remove any previously inserted SignatureHub block to avoid duplication
      const cleanBody = existingBody.replace(
        /<!-- SignatureHub:start -->[\s\S]*?<!-- SignatureHub:end -->/gi,
        ''
      ).trimEnd();

      const wrappedSignature = `
<!-- SignatureHub:start -->
<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
  ${signatureData.html}
</div>
<!-- SignatureHub:end -->`;

      const newBody = cleanBody + wrappedSignature;

      item.body.setAsync(newBody, { coercionType: Office.CoercionType.Html }, (setResult) => {
        if (setResult.status === Office.AsyncResultStatus.Failed) {
          return reject(setResult.error);
        }

        // Record impression if there's an active banner
        if (signatureData.bannerId) {
          fetch(`${API_BASE}/signatures/impression/${signatureData.bannerId}`, {
            method: 'POST',
            headers: { 'x-api-key': API_KEY },
          }).catch(() => {}); // Fire-and-forget
        }

        resolve(signatureData);
      });
    });
  });
}

// ─── Auto-run: OnNewMessageCompose ──────────────────────────────────────────

/**
 * Called automatically by Office when the user opens a new compose window.
 * Requires the LaunchEvent extension point in the manifest.
 */
async function onNewMessageComposeHandler(event) {
  try {
    const email = getMailboxEmail();
    if (!email) return event.completed({ allowEvent: true });

    const signatureData = await fetchSignature(email);
    const item = Office.context.mailbox.item;
    await setSignatureInBody(item, signatureData);
  } catch (err) {
    console.error('[SignatureHub] Auto-insert failed:', err);
  } finally {
    event.completed({ allowEvent: true });
  }
}

// ─── Ribbon Button: insertSignature ─────────────────────────────────────────

/**
 * Called when the user clicks "Insert Signature" in the ribbon.
 */
async function insertSignature(event) {
  try {
    const email = getMailboxEmail();
    if (!email) {
      return event.completed({ allowEvent: false, errorMessage: 'Cannot determine your email address.' });
    }

    const signatureData = await fetchSignature(email);
    const item = Office.context.mailbox.item;
    await setSignatureInBody(item, signatureData);
    event.completed({ allowEvent: true });
  } catch (err) {
    console.error('[SignatureHub] Insert signature failed:', err);
    event.completed({ allowEvent: false, errorMessage: 'Failed to load signature. Please try again.' });
  }
}

// Make functions available globally for Office.js to call by name
window.insertSignature = insertSignature;
window.onNewMessageComposeHandler = onNewMessageComposeHandler;
