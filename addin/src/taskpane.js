/*
 * SignatureHub Outlook Add-in — Task Pane
 * Shows the user their current signature with options to reload or update it.
 */

'use strict';

const API_BASE = 'https://your-signaturehub-domain.com/api';
const API_KEY  = 'YOUR_ADDIN_API_KEY';

Office.onReady(async ({ host }) => {
  if (host !== Office.HostType.Outlook) return;
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('content').style.display = 'none';

  try {
    const email = Office.context.mailbox.userProfile.emailAddress;
    document.getElementById('user-email').textContent = email;

    const signatureData = await fetchSignature(email);
    renderPreview(signatureData);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'flex';
  } catch (err) {
    showError('Failed to load your signature. Please try again.');
  }
});

async function fetchSignature(email) {
  const resp = await fetch(`${API_BASE}/signatures/generate?email=${encodeURIComponent(email)}`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  return resp.json();
}

function renderPreview(signatureData) {
  const frame = document.getElementById('signature-preview');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 12px; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body>${signatureData.html}</body>
    </html>
  `);
  doc.close();
  frame.dataset.signatureHtml = signatureData.html;
  frame.dataset.bannerId = signatureData.bannerId || '';
}

async function insertSignature() {
  const btn = document.getElementById('insert-btn');
  btn.disabled = true;
  btn.textContent = 'Inserting...';

  try {
    const frame = document.getElementById('signature-preview');
    const html = frame.dataset.signatureHtml;
    const bannerId = frame.dataset.bannerId;

    const item = Office.context.mailbox.item;

    await new Promise((resolve, reject) => {
      item.body.getAsync(Office.CoercionType.Html, (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) return reject(result.error);

        const clean = (result.value || '').replace(
          /<!-- SignatureHub:start -->[\s\S]*?<!-- SignatureHub:end -->/gi, ''
        ).trimEnd();

        const wrapped = `${clean}
<!-- SignatureHub:start -->
<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">${html}</div>
<!-- SignatureHub:end -->`;

        item.body.setAsync(wrapped, { coercionType: Office.CoercionType.Html }, (r) => {
          if (r.status === Office.AsyncResultStatus.Failed) return reject(r.error);
          resolve();
        });
      });
    });

    if (bannerId) {
      fetch(`${API_BASE}/signatures/impression/${bannerId}`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      }).catch(() => {});
    }

    btn.textContent = '✓ Inserted!';
    setTimeout(() => { btn.textContent = 'Insert Signature'; btn.disabled = false; }, 2000);
  } catch (err) {
    showError('Failed to insert signature: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Insert Signature';
  }
}

async function reloadSignature() {
  try {
    const email = Office.context.mailbox.userProfile.emailAddress;
    const signatureData = await fetchSignature(email);
    renderPreview(signatureData);
  } catch (err) {
    showError('Failed to reload signature.');
  }
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('loading').style.display = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// Attach button handlers once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('insert-btn')?.addEventListener('click', insertSignature);
  document.getElementById('reload-btn')?.addEventListener('click', reloadSignature);
});
