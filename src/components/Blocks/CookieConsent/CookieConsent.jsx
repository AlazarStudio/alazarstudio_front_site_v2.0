import React, { useEffect, useState } from "react";
import classes from "./CookieConsent.module.css";

const COOKIE_CONSENT_KEY = "cookieConsentAccepted";

function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        try {
            const accepted = window.localStorage.getItem(COOKIE_CONSENT_KEY) === "1";
            setIsVisible(!accepted);
        } catch {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        try {
            window.localStorage.setItem(COOKIE_CONSENT_KEY, "1");
        } catch {
            // no-op: if storage is unavailable, we still hide banner for current session
        }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={classes.banner} role="dialog" aria-live="polite" aria-label="Уведомление об использовании cookie">
            <p className={classes.text}>
                Мы используем cookie, чтобы сайт работал корректно и становился удобнее. Нажимая
                &nbsp;"Принять", вы соглашаетесь с использованием файлов cookie.
            </p>
            <button type="button" className={classes.acceptButton} onClick={handleAccept}>
                Принять
            </button>
        </div>
    );
}

export default CookieConsent;
