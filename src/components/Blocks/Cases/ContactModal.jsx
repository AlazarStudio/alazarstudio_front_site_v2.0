import React, { useState, useEffect } from 'react';
import Modal from '@/components/Standart/Modal/Modal.jsx';
import { contactRequestAPI, getApiBaseUrl } from '@/lib/api';
import classes from './ContactModal.module.css';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  company: '',
  budget: '',
  comment: '',
  consent: false,
};

function buildMessageBody({ comment, company, budget }) {
  const parts = [String(comment || '').trim()];
  const c = String(company || '').trim();
  const b = String(budget || '').trim();
  if (c) parts.push(`Компания: ${c}`);
  if (b) parts.push(`Бюджет: ${b}`);
  return parts.filter(Boolean).join('\n\n');
}

export default function ContactModal({
  isOpen,
  onClose,
  nested = true,
  source = 'Сайт: заявка',
  defaultComment = '',
}) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setSubmitting(false);
      setSubmitError('');
      return;
    }
    setForm({
      ...initialForm,
      comment: defaultComment || '',
    });
    setSubmitError('');
  }, [isOpen, defaultComment]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.consent) return;
    if (!getApiBaseUrl()) {
      setSubmitError('Не настроен адрес сервера. Укажите backend в config.json или VITE_API_URL.');
      return;
    }
    const message = buildMessageBody(form);
    if (message.length < 5) {
      setSubmitError('Заполните комментарий (не менее 5 символов).');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await contactRequestAPI.send({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        message,
        source: String(source || '').trim() || 'Сайт: заявка',
      });
      setForm(initialForm);
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Не удалось отправить заявку. Попробуйте позже.';
      setSubmitError(typeof msg === 'string' ? msg : 'Ошибка отправки.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} nested={nested} compact>
      <div className={classes.wrap}>
        <h2 className={classes.title}>Оставить заявку</h2>
        <form className={classes.form} onSubmit={handleSubmit}>
          {submitError ? <p className={classes.formError} role="alert">{submitError}</p> : null}
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ваше имя"
            className={classes.input}
            required
          />
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Телефон"
            className={classes.input}
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-MAIL"
            className={classes.input}
            required
          />
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="Компания"
            className={classes.input}
          />
          <input
            type="text"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            placeholder="Бюджет"
            className={classes.input}
          />
          <input
            type="text"
            name="comment"
            value={form.comment}
            onChange={handleChange}
            placeholder="Комментарий"
            className={classes.input}
            required
          />
          <label className={classes.consentLabel}>
            <input
              type="checkbox"
              name="consent"
              checked={form.consent}
              onChange={handleChange}
              className={classes.checkbox}
              required
            />
            <span>
              Я согласен с правилами обработки персональных данных
            </span>
          </label>
          <button type="submit" className={classes.submitBtn} disabled={submitting || !form.consent}>
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>
    </Modal>
  );
}
