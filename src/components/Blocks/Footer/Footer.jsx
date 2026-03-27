import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import classes from "./Footer.module.css";
import { publicContactsAPI } from "@/lib/api";

const FALLBACK_PHONE = "+7 928 399-53-84";
const FALLBACK_EMAIL = "info@alazarstudio.ru";
const FALLBACK_ADDRESS = "г. Черкесск, ул. Кавказская, 56";

const LEGAL_LINE1 = [
    "Пользовательское соглашение",
    "Политика конфиденциальности",
    "Согласие на обработку",
    "Политика Cookie",
];

const LEGAL_LINE2 = [];
const COPYRIGHT_TEXT =
    "Вся информация, представленная на сайте, носит информационный характер и не является публичной офертой, определяемой положениями Статьи 437(2) Гражданского кодекса РФ. Оставаясь на сайте, вы соглашаетесь с условиями Пользовательского соглашения и подтверждаете, что ознакомлены с Политикой обработки персональных данных.";

function parseSocialNetworks(str) {
    if (!str) return [];
    try {
        const parsed = typeof str === "string" ? JSON.parse(str) : str;
        if (!parsed?.linkEnabled || !Array.isArray(parsed.values) || !Array.isArray(parsed.links)) {
            return [];
        }
        return parsed.values
            .map((label, i) => ({
                label: String(label || "").trim(),
                url: String(parsed.links[i] || "").trim(),
            }))
            .filter((item) => item.url && item.url !== "#");
    } catch {
        return [];
    }
}

function resolveSocialIcon(label, url) {
    const source = `${label || ""} ${url || ""}`.toLowerCase();
    if (source.includes("vk") || source.includes("вконт")) return "/vk.png";
    if (source.includes("telegram") || source.includes("t.me") || source.includes("tg")) return "/tg.png";
    if (source.includes("whatsapp") || source.includes("wa.me") || source.includes("ватс")) return "/wa.png";
    if (source.includes("max") || source.includes("макс")) return "/max.png";
    return "";
}

function normalizeExternalUrl(url) {
    const raw = String(url || "").trim();
    if (!raw || raw === "#") return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    return `https://${raw.replace(/^\/+/, "")}`;
}

function Footer() {
    const [contactsData, setContactsData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await publicContactsAPI.get();
                if (!cancelled) setContactsData(res.data);
            } catch {
                if (!cancelled) setContactsData(null);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const contact = useMemo(() => {
        const list = contactsData?.contacts;
        if (!Array.isArray(list) || list.length === 0) return null;
        return list.find((c) => c.isPublished !== false) ?? list[0];
    }, [contactsData]);

    const phoneDisplay = String(contact?.nomer || FALLBACK_PHONE).trim();
    const phoneLink = useMemo(() => phoneDisplay.replace(/\D/g, ""), [phoneDisplay]);
    const email = String(contact?.e_mail || FALLBACK_EMAIL).trim();
    const address = String(contact?.adres || FALLBACK_ADDRESS).trim();
    const officeMapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;

    const socialItems = useMemo(() => {
        const parsed = contact?.sotsial_nye_seti != null ? parseSocialNetworks(contact.sotsial_nye_seti) : [];
        return parsed
            .map((item) => ({
                ...item,
                url: normalizeExternalUrl(item.url),
                icon: resolveSocialIcon(item.label, item.url),
            }))
            .filter((item) => item.icon && item.url);
    }, [contact]);

    return (
        <footer className={classes.footer}>
            <div className={classes.section}>
                <div className={classes.heroRow}>
                    <div className={classes.brandCol}>
                        <Link to="/" className={classes.logo}>
                            ALAZAR STUDIO
                        </Link>

                        <nav className={classes.socialList} aria-label="Социальные сети">
                            {socialItems.map((social) => (
                                <a
                                    key={`${social.label}-${social.url}`}
                                    className={classes.socialCircle}
                                    aria-label={social.label}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <img src={social.icon} alt="" className={classes.socialIcon} aria-hidden="true" />
                                </a>
                            ))}
                        </nav>
                    </div>

                    <address className={classes.contactSide}>
                        <Link to="/contacts" className={classes.officeTitle}>
                            Контакты
                        </Link>

                        <a href={`tel:${phoneLink}`} className={classes.officePhone}>
                            <span className={classes.contactLabel}>Телефон:</span> {phoneDisplay}
                        </a>

                        <a href={`mailto:${email}`} className={classes.email}>
                            <span className={classes.contactLabel}>Почта:</span> {email}
                        </a>

                        <a
                            href={officeMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={classes.officeAddress}
                        >
                            <span className={classes.contactLabel}>Адрес:</span> {address}
                        </a>
                    </address>
                </div>
            </div>

            <div className={classes.divider} />

            <div className={classes.section}>
                <div className={classes.bottomRow}>
                    <div className={classes.legalWrap}>
                        <nav className={classes.legalPills} aria-label="Юридическая информация">
                            {LEGAL_LINE1.map((text, i) => (
                                <span key={i} className={classes.legalPill}>
                                    {text}
                                </span>
                            ))}
                        </nav>
                        {LEGAL_LINE2.length > 0 && (
                            <nav className={classes.legalPills} aria-label="Дополнительная юридическая информация">
                                {LEGAL_LINE2.map((text, i) => (
                                    <span key={i} className={classes.legalPill}>
                                        {text}
                                    </span>
                                ))}
                            </nav>
                        )}
                    </div>
                </div>
            </div>

            <div className={classes.divider} />

            <div className={classes.section}>
                <div className={classes.copyright}>
                    {COPYRIGHT_TEXT}
                </div>
            </div>
        </footer>
    );
}

export default Footer;
