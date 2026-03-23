import React, { useState, useEffect } from 'react';
import Modal from '@/components/Standart/Modal/Modal.jsx';
import {
  CONTACT_FORM_INITIAL,
  submitContactRequest,
} from '@/lib/contactRequest';
import classes from './ContactModal.module.css';

export default function ContactModal({
  isOpen,
  onClose,
  nested = true,
  source = 'Сайт: заявка',
  defaultComment = '',
}) {
  const [form, setForm] = useState(CONTACT_FORM_INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
      return;
    }
    if (defaultComment) {
      setForm((prev) => {
        if (prev.comment.trim()) return prev;
        return { ...prev, comment: defaultComment };
      });
    }
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
    setSubmitSuccess(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitContactRequest(form, { source });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setForm(CONTACT_FORM_INITIAL);
      setSubmitSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} nested={nested} compact>
      <div className={`${classes.wrap} ${submitSuccess ? classes.wrapSuccessOnly : ''}`}>
        <h2 className={classes.title}>Оставить заявку</h2>
        {submitSuccess ? (
          <p className={classes.formSuccess} role="status">
            Сообщение успешно отправлено. Мы свяжемся с вами в ближайшее время.
          </p>
        ) : (
          <form className={classes.form} onSubmit={handleSubmit} noValidate>
            {submitError ? <p className={classes.formError} role="alert">{submitError}</p> : null}
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ваше имя"
              className={classes.input}
              autoComplete="name"
            />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Телефон"
              className={classes.input}
              autoComplete="tel"
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Электронная почта"
              className={classes.input}
              autoComplete="email"
            />
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="Компания (необязательно)"
              className={classes.input}
              autoComplete="organization"
            />
            <input
              type="text"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              placeholder="Бюджет (необязательно)"
              className={classes.input}
            />
            <input
              type="text"
              name="comment"
              value={form.comment}
              onChange={handleChange}
              placeholder="Комментарий к заявке"
              className={classes.input}
            />
            <label className={classes.consentLabel}>
              <input
                type="checkbox"
                name="consent"
                checked={form.consent}
                onChange={handleChange}
                className={classes.checkbox}
              />
              <span>
                Я согласен с правилами обработки персональных данных
              </span>
            </label>
            <button type="submit" className={classes.submitBtn} disabled={submitting || !form.consent}>
              {submitting ? 'Отправка…' : 'Отправить'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
