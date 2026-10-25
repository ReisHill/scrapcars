/* Quote integration boundary. Set a same-origin endpoint only after adding a
   server-side handler, rate limiting, validation and email delivery. Never put
   email-provider keys in this browser file. */
const QUOTE_CONFIG = Object.freeze({ endpoint: null });
const normaliseReg = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const validReg = value => /^[A-Z0-9\s]{2,10}$/i.test(value) && /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{2,7}$/.test(normaliseReg(value));
const normalisePostcode = value => {
  const compact = value.toUpperCase().replace(/\s/g, '');
  return compact.length > 3 ? compact.slice(0, -3) + ' ' + compact.slice(-3) : compact;
};
const validPostcode = value => /^(GIR 0AA|[A-PR-UWYZ][A-HK-Y]?\d[\dA-HJKPSTUW]? \d[ABD-HJLNP-UW-Z]{2})$/.test(normalisePostcode(value));
const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  navLinks.classList.toggle('open', isOpen);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton) {
    navLinks.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  }
});
for (const form of document.querySelectorAll('[data-reg-start]')) {
  const input = form.elements.reg;
  const button = form.querySelector('button[type=submit]');
  const error = form.querySelector('[aria-live="polite"]');
  button.disabled = false;
  input.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
  input.addEventListener('blur', () => { input.value = input.value.toUpperCase().trim(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validReg(input.value)) {
      error.textContent = 'Enter a UK registration, for example AB12 CDE.';
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true'); input.focus();
      return;
    }
    window.location.assign('/quote/?' + new URLSearchParams({reg: input.value.toUpperCase().trim()}).toString());
  });
}
const quoteForm = document.querySelector('#quote-form');
if (quoteForm) {
  quoteForm.addEventListener('invalid', event => {
    const input = event.target;
    const field = input.closest('.field');
    if (!field) return;
    let note = field.querySelector('.field-error');
    if (!note) {
      note = document.createElement('p');
      note.className = 'field-error';
      note.id = 'error-' + input.name;
      field.append(note);
    }
    note.textContent = input.type === 'radio' ? 'Choose an option to continue.' : input.validationMessage;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', note.id);
  }, true);
  const clearFieldError = event => {
    const field = event.target.closest('.field');
    if (!field) return;
    field.querySelector('.field-error')?.remove();
    field.querySelectorAll('[aria-invalid]').forEach(input => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
  };
  quoteForm.addEventListener('input', clearFieldError);
  quoteForm.addEventListener('change', clearFieldError);
  const submitButton = quoteForm.querySelector('button[type=submit]');
  submitButton.disabled = false;
  const params = new URLSearchParams(window.location.search);
  const reg = params.get('reg');
  if (reg && validReg(reg)) quoteForm.elements.reg.value = reg.toUpperCase().trim();
  const pickup = params.get('postcode');
  if (pickup && validPostcode(pickup)) quoteForm.elements.postcode.value = normalisePostcode(pickup);
  const condition = params.get('condition');
  const conditionOptions = ['running', 'non-runner', 'damaged', 'incomplete'];
  if (conditionOptions.includes(condition)) {
    quoteForm.querySelector(`input[name="condition"][value="${condition}"]`).checked = true;
  }
  const regInput = quoteForm.elements.reg;
  const postcodeInput = quoteForm.elements.postcode;
  const phoneInput = quoteForm.elements.phone;
  for (const input of [regInput, postcodeInput, phoneInput]) {
    input.addEventListener('input', () => input.setCustomValidity(''));
  }
  regInput.addEventListener('blur', () => { regInput.value = regInput.value.toUpperCase().trim(); });
  postcodeInput.addEventListener('blur', () => { postcodeInput.value = normalisePostcode(postcodeInput.value); });
  quoteForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (quoteForm.elements.website.value || submitButton.disabled) return;
    regInput.setCustomValidity(validReg(regInput.value) ? '' : 'Enter a UK registration, for example AB12 CDE.');
    postcodeInput.setCustomValidity(validPostcode(postcodeInput.value) ? '' : 'Enter a valid UK collection postcode, for example B70 0AA.');
    const phoneValue = phoneInput.value.trim();
    const phoneDigits = phoneValue.replace(/\D/g, '');
    phoneInput.setCustomValidity(!phoneValue || (/^[+\d\s().-]+$/.test(phoneValue) && phoneDigits.length >= 10 && phoneDigits.length <= 15) ? '' : 'Enter a valid phone number, or leave this optional field blank.');
    if (!quoteForm.reportValidity()) return;
    const originalValues = JSON.stringify(Array.from(new FormData(quoteForm).entries()));
    const originalLabel = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Checking pickup area…';
    quoteForm.setAttribute('aria-busy', 'true');
    let coverage;
    try { coverage = await SCRAPLOCAL_COVERAGE.check(postcodeInput.value); }
    finally { submitButton.disabled = false; submitButton.innerHTML = originalLabel; quoteForm.removeAttribute('aria-busy'); }
    if (originalValues !== JSON.stringify(Array.from(new FormData(quoteForm).entries()))) {
      const error = document.querySelector('#form-error');
      error.textContent = 'Your details changed. Please review them and try again.';
      error.hidden = false;
      return;
    }
    if (!coverage.ok) {
      postcodeInput.setCustomValidity(coverage.message);
      quoteForm.reportValidity();
      return;
    }
    const payload = {
      registration: regInput.value.toUpperCase().trim(),
      v5c: quoteForm.elements.v5c.value,
      condition: quoteForm.elements.condition.value,
      postcode: normalisePostcode(postcodeInput.value),
      email: quoteForm.elements.email.value.trim(),
      phone: phoneValue || null,
      source: 'scraplocal-website'
    };
    const error = document.querySelector('#form-error');
    error.hidden = true;
    if (QUOTE_CONFIG.endpoint) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending your request…';
      try {
        const response = await fetch(QUOTE_CONFIG.endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Quote delivery failed');
        renderSummary(payload, true);
      } catch {
        error.textContent = 'Your request could not be sent. Your details are still here — please try again.';
        error.hidden = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Request my quote';
      }
    } else {
      renderSummary(payload, false);
    }
  });
}
function renderSummary(data, delivered) {
  const target = document.querySelector('#quote-content');
  const oldHeading = document.querySelector('.quote-heading');
  if (oldHeading) oldHeading.hidden = true;
  target.classList.remove('quote-layout');
  const labels = { running: 'Running & complete', 'non-runner': 'Not running', damaged: 'Damaged', incomplete: 'Missing parts', yes: 'Yes', no: 'No', unsure: 'Not sure' };
  const section = document.createElement('section');
  section.className = 'success';
  section.innerHTML = '<div class="success-icon"><svg class="ico" aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></div><span class="eyebrow">' + (delivered ? 'Request received' : 'Preview complete') + '</span><h1 tabindex="-1">' + (delivered ? 'Your quote request has been sent.' : 'Your quote request is ready.') + '</h1><p></p><dl class="summary-list"></dl><div class="success-actions"><button class="btn outline" id="edit-request" type="button">Edit my details</button><a class="btn" href="/">Back to home →</a></div>';
  section.querySelector('p').textContent = delivered ? 'Your details have been sent for a quote. This does not commit you to selling or book a collection.' : 'This is a preview. Nothing has been sent, no quote has been calculated and no collection has been booked. Your details are shown below so you can review the journey.';
  const rows = [['Registration', data.registration], ['V5C logbook', labels[data.v5c]], ['Car condition', labels[data.condition]], ['Collection postcode', data.postcode], ['Email address', data.email], ['Phone number', data.phone || 'Not provided (optional)']];
  for (const [label, value] of rows) {
    const row = document.createElement('div'); row.className = 'summary-row';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    row.append(dt, dd); section.querySelector('dl').append(row);
  }
  // Keep the existing form in memory for an edit, with no local/session storage.
  const savedNodes = Array.from(target.childNodes);
  target.replaceChildren(section);
  section.querySelector('#edit-request').addEventListener('click', () => {
    target.replaceChildren(...savedNodes);
    target.classList.add('quote-layout');
    if (oldHeading) oldHeading.hidden = false;
    const button = quoteForm.querySelector('button[type=submit]');
    button.disabled = false;
    button.innerHTML = 'Review my request <span aria-hidden="true">→</span>';
    quoteForm.elements.reg.focus();
    window.scrollTo({top:0,behavior:'instant'});
  });
  section.querySelector('h1').focus();
  window.scrollTo({top:0,behavior:'instant'});
}
