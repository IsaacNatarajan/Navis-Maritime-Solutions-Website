// Cloudflare Pages Function: POST /api/contact
// Receives the website contact form, checks it, and passes it on to Web3Forms.
// The Web3Forms access key and the Turnstile secret are stored in Cloudflare
// (Settings > Variables and Secrets) and never appear in GitHub or in the browser.
//
// Required Cloudflare secrets (Production):
//   WEB3FORMS_KEY      - Web3Forms access key
//   TURNSTILE_SECRET   - Cloudflare Turnstile secret key
// Required Cloudflare build variable:
//   PUBLIC_TURNSTILE_SITE_KEY - Cloudflare Turnstile site key (public by design)

const ALLOWED_HOSTS = ['navismaritime.ae', 'www.navismaritime.ae', 'navis-maritime.pages.dev'];
const LIMITS = { name: 100, company: 120, email: 150, phone: 40, service: 120, message: 5000 };

const reply = (status, success, message) =>
  new Response(JSON.stringify({ success, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function hostAllowed(url) {
  try {
    const h = new URL(url).hostname;
    return ALLOWED_HOSTS.includes(h) || h.endsWith('.navis-maritime.pages.dev');
  } catch (e) {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  // 1. Only accept submissions coming from our own website
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!hostAllowed(origin)) return reply(403, false, 'This form can only be sent from navismaritime.ae.');

  if (!env.WEB3FORMS_KEY || !env.TURNSTILE_SECRET) {
    return reply(500, false, 'The form is not set up yet. Please email info@navismaritime.ae.');
  }

  // 2. Refuse oversized requests
  const size = Number(request.headers.get('Content-Length') || 0);
  if (size > 20000) return reply(413, false, 'Your message is too long.');

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return reply(400, false, 'Sorry, the form could not be read.');
  }
  const get = (k) => String(form.get(k) || '').trim();

  // 3. Hidden bot trap: people never see or tick this box
  if (get('botcheck')) return reply(200, true, 'Thank you.');

  // 4. Check the fields
  const data = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = get(k);
    if (v.length > max) return reply(400, false, 'One of the fields is too long.');
    data[k] = v;
  }
  if (!data.name || !data.email || !data.message) return reply(400, false, 'Please fill in your name, email and message.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return reply(400, false, 'Please enter a valid email address.');

  // 5. Cloudflare Turnstile: confirms a real person sent the form
  const token = get('cf-turnstile-response');
  if (!token) return reply(400, false, 'Please complete the security check.');
  const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') || undefined,
    }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!ts.success) return reply(403, false, 'The security check failed. Please try again.');

  // 6. Pass it on to Web3Forms with the secret key added here, on the server
  const payload = {
    access_key: env.WEB3FORMS_KEY,
    subject: `New enquiry from navismaritime.ae${data.service ? ' - ' + data.service : ''}`,
    from_name: 'Navis Maritime website',
    replyto: data.email,
    Name: data.name,
    Company: data.company || '-',
    Email: data.email,
    Phone: data.phone || '-',
    Service: data.service || '-',
    Message: data.message,
  };
  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.success) return reply(200, true, 'Thank you. Your enquiry has been sent.');
    console.log('Web3Forms error', r.status, JSON.stringify(j).slice(0, 300));
  } catch (e) {
    console.log('Web3Forms fetch failed', String(e));
  }
  return reply(502, false, 'Sorry, something went wrong. Please email info@navismaritime.ae or call us directly.');
}

// Anything other than POST is refused
export async function onRequest() {
  return reply(405, false, 'Method not allowed.');
}
