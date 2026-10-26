const districts = ['Birmingham', 'Sandwell', 'Dudley', 'Walsall', 'Wolverhampton'];
const emailPattern = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const json = (status, data) => Response.json(data, {status, headers:{'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}});
const unavailable = () => json(503, {error:'Sending is unavailable. Your details have not been confirmed as sent. Please try again.'});
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function acknowledgement(lead) {
  const registration = escapeHtml(lead.registration);
  const reference = escapeHtml(lead.submission_id);
  return {
    subject: `We've got your ${lead.registration} quote request | Scrap Cars Sorted`,
    text: [
      'Hi there,', '',
      `Thanks for getting in touch about ${lead.registration}. Your quote request has landed safely with Scrap Cars Sorted.`,
      "We'll share your request with Scrap Car Network, the vehicle buyer, to prepare an offer. ADAC Recovery Solutions handles enquiries and collection. We'll be back to you very shortly with the next steps.", '',
      `Your reference: ${lead.submission_id}`, '',
      'There is no obligation to sell. Please wait until a price and collection details are agreed before making arrangements.', '',
      'Need to add something? Just reply to this email or call 07973 566033.', '',
      'Thanks,', 'The Scrap Cars Sorted team',
      'scrapcarsorted.co.uk'
    ].join('\n'),
    html: `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#f4f7f4;font-family:Arial,sans-serif;color:#18352b"><div style="max-width:560px;margin:auto;background:#fff;border-radius:18px;overflow:hidden"><div style="background:#153f32;padding:24px;color:#fff;font-size:22px;font-weight:700">Scrap Cars Sorted</div><div style="padding:28px"><p style="margin-top:0">Hi there,</p><h1 style="font-size:26px;line-height:1.25;margin:12px 0;color:#153f32">Thanks, we've got your request.</h1><p>Thanks for getting in touch about <strong>${registration}</strong>. Your quote request has landed safely with us.</p><p>We'll share your request with Scrap Car Network, the vehicle buyer, to prepare an offer. ADAC Recovery Solutions handles enquiries and collection. We'll be back to you very shortly with the next steps.</p><p style="padding:14px;background:#f4f7f4;border-radius:8px">Your reference: <strong>${reference}</strong></p><p>There's no obligation to sell. We'll confirm the price and collection details before you decide.</p><p>Need to add something? Reply to this email or call <a href="tel:07973566033" style="color:#153f32">07973 566033</a>.</p><p>Thanks,<br><strong>The Scrap Cars Sorted team</strong></p></div></div><p style="text-align:center;font-size:12px;color:#586b61">Scrap Cars Sorted · <a href="https://scrapcarsorted.co.uk/" style="color:#586b61">scrapcarsorted.co.uk</a></p></body></html>`
  };
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error('Too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function validateLead(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = key => typeof value[key] === 'string' ? value[key].trim() : '';
  const registration = text('registration').toUpperCase().replace(/\s/g,'');
  const postcode = text('postcode').toUpperCase().replace(/\s/g,'');
  const email = text('email'); const phone = text('phone');
  if (text('website') || value.website && typeof value.website !== 'string') return null;
  if (!/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{2,7}$/.test(registration)) return null;
  if (!/^(GIR0AA|[A-PR-UWYZ][A-HK-Y]?\d[\dA-HJKPSTUW]?\d[ABD-HJLNP-UW-Z]{2})$/.test(postcode)) return null;
  if (!['running','non-runner','damaged','incomplete'].includes(value.condition) || !['yes','no','unsure'].includes(value.v5c)) return null;
  if (email.length > 254 || !emailPattern.test(email)) return null;
  if (phone && (phone.length > 25 || !/^[+\d\s().-]+$/.test(phone) || !/^\d{10,15}$/.test(phone.replace(/\D/g,'')))) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text('submission_id'))) return null;
  return {registration, postcode, email, phone, condition:value.condition, v5c:value.v5c, submission_id:text('submission_id')};
}

export async function handleQuote(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  let origin;
  try { origin = new URL(env.PUBLIC_ORIGIN); } catch { return unavailable(); }
  if (origin.protocol !== 'https:' || origin.origin !== env.PUBLIC_ORIGIN) return unavailable();
  if (new URL(request.url).origin !== origin.origin || request.headers.get('Origin') !== origin.origin) return json(403,{error:'Use the quote form on our website.'});
  if (env.QUOTE_DELIVERY_ENABLED !== 'true' || !env.RESEND_API_KEY || !emailPattern.test(env.QUOTE_TO || '') || !emailPattern.test(env.QUOTE_FROM || '') || !env.QUOTE_RATE_LIMITER) return unavailable();
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) return json(415,{error:'JSON required.'});
  if (Number(request.headers.get('Content-Length')) > 8192) return json(413,{error:'Request too large.'});
  try {
    // IP addresses are used only for abuse control, never put in email or logs.
    // Shared networks may hit this approximate per-location limit together.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return unavailable();
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode('scrapcars-quote:'+ip));
    const key = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const limit = await env.QUOTE_RATE_LIMITER.limit({key});
    if (!limit.success) return json(429,{error:'Please wait a minute before trying again.'});
    let body;
    try { body = await readBody(request); } catch { return json(400,{error:'Invalid request.'}); }
    const lead = validateLead(body);
    if (!lead) return json(400,{error:'Check your registration, postcode and contact details.'});
    // Browser checks can be bypassed: always verify the actual district here.
    const lookup = await fetcher('https://api.postcodes.io/postcodes/'+encodeURIComponent(lead.postcode),{signal:AbortSignal.timeout(8000)});
    if (lookup.status === 404) return json(422,{error:'Check the pickup postcode.'});
    if (!lookup.ok) return unavailable();
    const coverage = await lookup.json();
    if (coverage.status !== 200 || typeof coverage.result?.admin_district !== 'string') return unavailable();
    if (!districts.includes(coverage.result.admin_district)) return json(422,{error:'This pickup postcode is outside our collection area.'});
    const labels = {running:'Running & complete','non-runner':'Not running',damaged:'Damaged',incomplete:'Missing parts',yes:'Yes',no:'No',unsure:'Not sure'};
    const text = [
      'New website quote request', '', 'Registration: '+lead.registration,
      'Car condition: '+labels[lead.condition], 'V5C logbook: '+labels[lead.v5c],
      'Pickup postcode: '+lead.postcode, 'Email: '+lead.email,
      'Phone: '+(lead.phone || 'Not provided'), '',
      'Reference: '+lead.submission_id, 'Reply to this email to contact the seller.',
      'This is a quote enquiry, not a confirmed sale or collection.'
    ].join('\n');
    const thanks = acknowledgement(lead);
    const response = await fetcher('https://api.resend.com/emails/batch',{
      method:'POST', signal:AbortSignal.timeout(12000),
      headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'quote-pair/'+lead.submission_id},
      body:JSON.stringify([
        {from:'Scrap Cars Sorted <'+env.QUOTE_FROM+'>',to:[env.QUOTE_TO],reply_to:lead.email,subject:'Car quote request: '+lead.registration,text},
        {from:'Scrap Cars Sorted <'+env.QUOTE_FROM+'>',to:[lead.email],reply_to:env.QUOTE_TO,...thanks}
      ])
    });
    if (!response.ok) return unavailable();
    const receipt = await response.json();
    if (!Array.isArray(receipt.data) || receipt.data.length !== 2 || !receipt.data.every(item => typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(item.id))) return unavailable();
    // Accepted by email provider; not a guarantee of inbox delivery.
    return json(200,{status:'sent',request_id:lead.submission_id});
  } catch { return unavailable(); } // Never log the body, email address or secrets.
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/quote') return handleQuote(request,env);
    if (pathname.startsWith('/api/')) return json(404,{error:'Not found.'});
    return env.ASSETS.fetch(request);
  }
};
