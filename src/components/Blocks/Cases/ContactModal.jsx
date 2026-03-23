import React, { useState, useEffect } from 'react';
import Modal from '@/components/Standart/Modal/Modal.jsx';
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

export default function ContactModal({ isOpen, onClose, nested = true }) {
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
    <Modal isOpen={isOpen} onClose={onClose} nested={nested} compact>
      <div className={classes.wrap}>
        <h2 className={classes.title}>Оставить заявку</h2>
        <form className={classes.form} onSubmit={handleSubmit}>
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
