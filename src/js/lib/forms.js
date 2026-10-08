// Accordions (roles, FAQ) and the contact form, which composes an email:
// there is no backend, so nothing is stored or sent anywhere else.
import { $, $$, t, EMAIL } from './env.js';

export function initAccordions() {
  $$('[data-accordion]').forEach((group) => {
    const buttons = $$('button[aria-controls]', group);
    const panelOf = (btn) => document.getElementById(btn.getAttribute('aria-controls'));
    buttons.forEach((btn) => {
      const panel = panelOf(btn);
      if (panel) panel.inert = true;
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        buttons.forEach((other) => {
          const isTarget = other === btn && open;
          other.setAttribute('aria-expanded', String(isTarget));
          other.closest('.role, .qa')?.classList.toggle('is-open', isTarget);
          const p = panelOf(other);
          if (p) p.inert = !isTarget;
        });
      });
    });
  });

  // Each "Apply" email starts with a short, translated greeting.
  $$('.role__apply').forEach((a) => {
    const role = a.closest('.role')?.querySelector('.role__title')?.textContent.trim() || '';
    a.href += `&body=${encodeURIComponent(t('applyHello', { role }))}`;
  });
}

function prefill(link) {
  const form = $('#contact-form');
  if (!form) return;
  const need = link.dataset.need;
  const chip = need && form.querySelector(`input[name="needs"][value="${CSS.escape(need)}"]`);
  if (chip) chip.checked = true;
  const msg = $('#f-message', form);
  if (msg && !msg.value.trim()) msg.value = t('prefill', { subject: link.dataset.subject || '' }) + ' ';
}

export function initContactForm() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-subject]');
    if (link) prefill(link);
  });

  const form = $('#contact-form');
  const note = $('#form-note');
  if (!form || !note) return;
  const defaultNote = note.textContent;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const get = (k) => String(data.get(k) || '').trim();
    const name = get('name');
    const email = get('email');
    const company = get('company');
    const message = get('message');
    const needs = $$('input[name="needs"]:checked', form).map((input) => input.nextElementSibling?.textContent.trim());

    const checks = [
      ['f-name', name.length > 1],
      ['f-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)],
      ['f-message', message.length > 5],
    ];
    let firstInvalid = null;
    checks.forEach(([id, ok]) => {
      const input = document.getElementById(id);
      input.closest('.field').classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      note.textContent = t('formError');
      note.classList.add('is-error');
      firstInvalid.focus();
      return;
    }

    const subject = t('mailSubject', { name }) + (company ? ` (${company})` : '');
    const body = [
      t('mailHello'),
      '',
      message,
      '',
      `${t('mailNeeds')}: ${needs.length ? needs.join(', ') : '-'}`,
      '',
      `${t('mailName')}: ${name}`,
      `${t('mailEmail')}: ${email}`,
      `${t('mailCompany')}: ${company || '-'}`,
    ].join('\n');

    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.classList.remove('is-error');
    note.textContent = t('formOpening', { email: EMAIL });
  });

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('is-invalid')) {
      field.classList.remove('is-invalid');
      e.target.removeAttribute('aria-invalid');
    }
    if (note.classList.contains('is-error') && !$('.field.is-invalid', form)) {
      note.classList.remove('is-error');
      note.textContent = defaultNote;
    }
  });
}
