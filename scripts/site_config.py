"""Launch settings and concise policies. No business details are invented."""
from pathlib import Path
import html,json,re

def load_settings(root, live, indexable):
 config=json.loads((root/'config/site.json').read_text())
 if not isinstance(config.get('brand'),str) or not config['brand'].strip():
  raise SystemExit('Set a non-empty brand in config/site.json.')
 if indexable and not live:
  raise SystemExit('Indexing requires SITE_LIVE=true and completed launch settings.')
 if live:
  required=['legal_name','business_address','contact_email','google_business_url','licence_details','service_role','quote_retention','provider_retention_and_transfers']
  missing=[key for key in required if not isinstance(config.get(key),str) or not config[key].strip()]
  if missing:raise SystemExit('Complete config/site.json before launch: '+', '.join(missing))
  if config.get('policies_reviewed') is not True:raise SystemExit('Review the business details and policies, then set policies_reviewed=true.')
  if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+',config['contact_email']):raise SystemExit('Set a valid contact email.')
  if not config['google_business_url'].startswith('https://'):raise SystemExit('Google Business URL must use HTTPS.')
  if config['service_role'] not in ('buyer','introducer'):raise SystemExit('service_role must be buyer or introducer.')
  if bool(config.get('company_number')) != bool(config.get('company_jurisdiction')):raise SystemExit('Company number and jurisdiction must be provided together.')
 return config

def business_details(config):
 e=lambda key:html.escape(config.get(key,'')).replace('\n','<br>')
 name=e('legal_name')
 brand=e('brand')
 identity=name if name==brand else f'{name}, trading as {brand}'
 details=f"<p>{identity}.<br>{e('business_address')}<br><a href=\"mailto:{e('contact_email')}\">{e('contact_email')}</a></p>"
 if config.get('company_number'):details+=f"<p>Company number {e('company_number')}. Registered in {e('company_jurisdiction')}.</p>"
 if config.get('vat_number'):details+=f"<p>VAT number: {e('vat_number')}.</p>"
 details+=f"<p>{e('licence_details')}</p>"
 return details

def production_policies(config):
 e=lambda key:html.escape(config[key]).replace('\n','<br>')
 identity=business_details(config)
 sharing='our sole vehicle-buying and collection partner, so they can prepare your quote and arrange collection if you choose to proceed' if config['service_role']=='introducer' else 'the collection operator or authorised treatment facility where needed to carry out the sale or collection you agree to'
 privacy=f'''<h2>Who we are</h2>{identity}
<h2>What we use and why</h2><p>We use your registration, car condition, V5C status, pickup postcode, email and optional phone number to prepare and answer your quote request and arrange a sale or collection if you choose to proceed. Our lawful basis is taking steps at your request before entering a contract and performing that contract. Required fields are needed to answer your request; your phone number is optional. We do not use quote details for marketing or automated valuations.</p>
<h2>Who receives your information</h2><p>Cloudflare hosts and protects this website. Resend delivers your request to our business email inbox. Postcodes.io receives your pickup postcode to check our coverage. We may share relevant details with {sharing}, and with authorities where legally required. We will identify the buyer before you agree to sell.</p><p>{e('provider_retention_and_transfers')}</p>
<h2>How long we keep it</h2><p>{e('quote_retention')}</p><p>We do not save contact details in browser storage or an application database. Registration entered on the first page passes in the quote URL and may appear in browser history and hosting logs. Technical request information, including IP addresses, is processed for security and short-term abuse prevention, based on our legitimate interest in running a secure website.</p>
<h2>Your choices and rights</h2><p>Contact the email above to ask for access, correction, erasure, restriction or a portable copy of your data where applicable. You can object to processing based on legitimate interests. Some records may need to be kept to meet legal obligations. You can complain to the <a href="https://ico.org.uk/make-a-complaint/">Information Commissioner’s Office</a>.</p>
<h2>Cookies</h2><p>This site does not use advertising or analytics cookies. The quote form works without storing contact details on your device. Fonts are served from this website. Security services may process technical requests to protect the site.</p>'''
 role='We buy vehicles directly. Any sale and collection arrangements are agreed separately after your enquiry.' if config['service_role']=='buyer' else 'We handle enquiries in partnership with one vehicle buyer and collection operator. We pass your request to that partner to prepare an offer and arrange collection if you choose to proceed. We will identify the buyer before you agree to sell; your vehicle sale is with that buyer.'
 terms=f'''<h2>Who you are contacting</h2>{identity}<p>{role}</p>
<h2>Your quote request</h2><p>Submitting this form asks for a quote. It does not commit you to selling or book a collection. There is no automatic price calculation. We aim to reply within an hour, but response times vary. You can decline an offer.</p>
<h2>Before you agree</h2><p>Give accurate details of the vehicle, missing parts, ownership and collection access. You must own the vehicle or have the owner’s permission to sell it. The buyer will confirm any quote validity, checks, collection costs or deductions, payment method and timing before you agree. If details differ, any revised offer must be agreed before handover.</p>
<h2>Collection and payment</h2><p>Same-day pickup depends on location and availability and is only booked once confirmed. Identity, address and ownership checks may be required. Scrap-metal purchases are paid by bank transfer or another legally permitted cashless method, never physical cash. Confirm payment and paperwork before the vehicle leaves.</p>
<h2>Paperwork and changes</h2><p>Vehicles being scrapped must go to an authorised treatment facility. Confirm the receiving facility and which documents apply, and notify DVLA as required. If you need to change or cancel an arrangement, contact us as soon as possible. Any separate sale or collection terms will be provided before agreement.</p>
<h2>Questions or complaints</h2><p>Email us using the address above with your registration and what happened. We will review your concern and respond as soon as we can. These website terms do not limit your statutory rights or exclude liability that cannot lawfully be excluded.</p>'''
 return privacy,terms
