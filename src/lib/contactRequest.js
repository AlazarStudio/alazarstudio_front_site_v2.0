import { contactRequestAPI, getApiBaseUrl } from '@/lib/api';

export const CONTACT_FORM_INITIAL = {
  name: '',
  phone: '',
  email: '',
  company: '',
  budget: '',
  comment: '',
  consent: false,
};

export function buildContactMessageBody({ comment, company, budget }) {
  const parts = [String(comment || '').trim()];
  const c = String(company || '').trim();
  const b = String(budget || '').trim();
  if (c) parts.push(`Компания: ${c}`);
  if (b) parts.push(`Бюджет: ${b}`);
  return parts.filter(Boolean).join('\n\n');
}

export function humanizeContactApiMessage(raw) {
  const s = String(raw || '').trim();
  if (!s) return 'Не удалось отправить заявку. Попробуйте позже.';
  if (/network error/i.test(s)) {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова.';
  }
  const statusFail = s.match(/request failed with status code\s*(\d+)/i);
  if (statusFail) {
    const code = statusFail[1];
    if (code === '500') return 'Ошибка на сервере. Попробуйте позже или напишите нам на почту.';
    if (code === '413') return 'Сообщение слишком большое. Сократите текст и попробуйте снова.';
    return 'Сервер вернул ошибку. Попробуйте позже.';
  }
  const map = [
    [/name is required/gi, 'Укажите имя.'],
    [/phone is required/gi, 'Укажите телефон.'],
    [/message is required/gi, 'Напишите комментарий.'],
    [/email is required/gi, 'Укажите e-mail.'],
    [/must be at least (\d+) characters/gi, 'Слишком короткое значение (минимум $1 символов).'],
    [/must be no more than (\d+) characters/gi, 'Слишком длинное значение (максимум $1 символов).'],
    [/must be a valid email/gi, 'Введите корректный e-mail.'],
    [
      /phone must contain only digits and phone symbols/gi,
      'Телефон: только цифры, пробелы и символы + - ( )',
    ],
    [/SMTP is not configured[^.]*/gi, 'Почта на сервере не настроена. Обратитесь к администратору.'],
  ];
  let out = s;
  for (const [re, rep] of map) {
    out = out.replace(re, rep);
  }
  return out;
}

/**
 * @param {typeof CONTACT_FORM_INITIAL} form
 * @param {{ source: string }} options
 * @returns {{ ok: true, name: string, phone: string, email: string, message: string, source: string } | { ok: false, error: string }}
 */
export function validateContactFormForSubmit(form, options = {}) {
  const source = String(options.source || '').trim() || 'Сайт: заявка';

  if (!form.consent) {
    return { ok: false, error: 'Нужно согласие на обработку персональных данных.' };
  }

  const name = form.name.trim();
  const phone = form.phone.trim();
  const email = form.email.trim();
  const comment = form.comment.trim();

  if (!name) return { ok: false, error: 'Введите имя.' };
  if (name.length < 2) return { ok: false, error: 'Имя слишком короткое (минимум 2 символа).' };
  if (!phone) return { ok: false, error: 'Введите телефон.' };
  if (phone.length < 5) return { ok: false, error: 'Телефон слишком короткий.' };
  if (!/^[0-9+\-() ]+$/.test(phone)) {
    return { ok: false, error: 'Телефон: только цифры, пробелы и символы + - ( ).' };
  }
  if (!email) return { ok: false, error: 'Введите e-mail.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Введите корректный e-mail.' };
  }
  if (!comment) return { ok: false, error: 'Напишите комментарий.' };
  if (!getApiBaseUrl()) {
    return {
      ok: false,
      error:
        'Не настроен адрес сервера. Укажите адрес бэкенда в config.json или в переменной VITE_API_URL.',
    };
  }

  const message = buildContactMessageBody(form);
  if (message.length < 5) {
    return { ok: false, error: 'Комментарий слишком короткий (минимум 5 символов).' };
  }

  return { ok: true, name, phone, email, message, source };
}

export async function submitContactRequest(form, options = {}) {
  const v = validateContactFormForSubmit(form, options);
  if (!v.ok) return { ok: false, error: v.error };
  try {
    await contactRequestAPI.send({
      name: v.name,
      phone: v.phone,
      email: v.email,
      message: v.message,
      source: v.source,
    });
    return { ok: true };
  } catch (err) {
    const raw =
      err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
    return { ok: false, error: humanizeContactApiMessage(raw) };
  }
}
