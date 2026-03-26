import React, { useEffect, useRef, useState } from "react";
import classes from "./Discuss.module.css";
import ParticleImageCanvas from "./ParticleImageCanvas";
import {
  CONTACT_FORM_INITIAL,
  submitContactRequest,
} from "@/lib/contactRequest";

const LOGO_ASPECT_RATIO = 3599.16 / 3120.19;
const LOGO_WIDTH_FACTOR = 0.9;
const MOBILE_BREAKPOINT = "(max-width: 767px)";

const FORM_COPY = {
  title: "Обсудить",
  titleAccent: "проект",
  name: "Ваше имя",
  phone: "Телефон",
  email: "Электронная почта",
  company: "Компания (необязательно)",
  budget: "Бюджет (необязательно)",
  comment: "Комментарий к заявке",
  consent: "Я согласен с правилами",
  consentAccent: "обработки персональных данных",
  submit: "Отправить",
  submitting: "Отправка…",
};

const SUCCESS_TEXT =
  "Сообщение успешно отправлено. Мы свяжемся с вами в ближайшее время.";

const SUCCESS_MESSAGE_MS = 10_000;

function Discuss({ formOnly = false, source = "Главная: обсудить проект" }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(CONTACT_FORM_INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [particleHeight, setParticleHeight] = useState(0);
  const [hideParticleOnMobile, setHideParticleOnMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }

    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const syncVisibility = () => {
      setHideParticleOnMobile(mediaQuery.matches);
    };

    syncVisibility();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncVisibility);

      return () => {
        mediaQuery.removeEventListener("change", syncVisibility);
      };
    }

    mediaQuery.addListener(syncVisibility);

    return () => {
      mediaQuery.removeListener(syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!submitSuccess) return undefined;
    const timerId = window.setTimeout(() => {
      setSubmitSuccess(false);
    }, SUCCESS_MESSAGE_MS);
    return () => window.clearTimeout(timerId);
  }, [submitSuccess]);

  useEffect(() => {
    if (formOnly || hideParticleOnMobile) {
      return undefined;
    }

    const formElement = formRef.current;
    if (!formElement) {
      return undefined;
    }

    const updateParticleHeight = () => {
      setParticleHeight(Math.max(0, Math.round(formElement.getBoundingClientRect().height)));
    };

    updateParticleHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateParticleHeight();
    });

    resizeObserver.observe(formElement);
    window.addEventListener("resize", updateParticleHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateParticleHeight);
    };
  }, [formOnly, hideParticleOnMobile, submitSuccess, submitError, form]);

  const particleStyle = particleHeight > 0
    ? {
        "--particle-height": `${particleHeight}px`,
        "--particle-width": `${Math.round(particleHeight * LOGO_ASPECT_RATIO * LOGO_WIDTH_FACTOR)}px`,
      }
    : undefined;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitting(true);
    setSubmitError("");
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

  const formBlock = (
    <div
      ref={formOnly ? null : formRef}
      className={`${classes.discuss_form} ${formOnly ? classes.discuss_formOnly : ""}`}
    >
      <form onSubmit={handleSubmit} noValidate>
        <h2 className={classes.formTitle}>
          {FORM_COPY.title}
          <span> {FORM_COPY.titleAccent}</span>
        </h2>

        {submitSuccess ? (
          <p className={`${classes.formAlert} ${classes.formAlertSuccess}`} role="status">
            {SUCCESS_TEXT}
          </p>
        ) : null}
        {submitError ? (
          <p className={`${classes.formAlert} ${classes.formAlertError}`} role="alert">
            {submitError}
          </p>
        ) : null}

        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder={FORM_COPY.name}
          autoComplete="name"
        />
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder={FORM_COPY.phone}
          autoComplete="tel"
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder={FORM_COPY.email}
          autoComplete="email"
        />
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={handleChange}
          placeholder={FORM_COPY.company}
          autoComplete="organization"
        />
        <input
          type="text"
          name="budget"
          value={form.budget}
          onChange={handleChange}
          placeholder={FORM_COPY.budget}
        />
        <input
          type="text"
          name="comment"
          value={form.comment}
          onChange={handleChange}
          placeholder={FORM_COPY.comment}
        />

        <label className={classes.formInclude}>
          <input
            type="checkbox"
            name="consent"
            checked={form.consent}
            onChange={handleChange}
          />
          <p>
            {FORM_COPY.consent} <span>{FORM_COPY.consentAccent}</span>
          </p>
        </label>

        <button type="submit" disabled={submitting || !form.consent}>
          {submitting ? FORM_COPY.submitting : FORM_COPY.submit}
        </button>
      </form>
      <img src="/formBG.png" alt="" aria-hidden="true" className={classes.formBG} />
    </div>
  );

  if (formOnly) {
    return formBlock;
  }

  return (
    <section className={classes.discussContainer} aria-label="Форма обсуждения проекта">
      <div className={"centerBlock"}>
        <div className={classes.discuss}>
          {formBlock}

          {!hideParticleOnMobile && (
            <div className={classes.discuss_img}>
              <ParticleImageCanvas
                alt="Alazar Studio A"
                className={classes.discuss_particle}
                style={particleStyle}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Discuss;
