import React, { useState, useEffect } from 'react';
import Modal from '@/components/Standart/Modal/Modal.jsx';
import classes from './ContactModal.module.css';

const initialForm = {
  fio: '',
  phone: '',
  email: '',
  message: '',
  consent: false,
};

export default function ContactModal({ isOpen, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.consent) return;
    setSubmitting(true);
    // TODO: отправка на бэкенд
    setTimeout(() => {
      setSubmitting(false);
      setForm(initialForm);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} nested compact>
      <div className={classes.wrap}>
        <h2 className={classes.title}>Оставить заявку</h2>
        <form className={classes.form} onSubmit={handleSubmit}>
          <input
            type="text"
            name="fio"
            value={form.fio}
            onChange={handleChange}
            placeholder="ФИО"
            className={classes.input}
            required
          />
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Номер телефона"
            className={classes.input}
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            className={classes.input}
            required
          />
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Текст обращения"
            className={classes.textarea}
            rows={4}
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
              Я согласен на обработку персональных данных в соответствии с политикой конфиденциальности
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
