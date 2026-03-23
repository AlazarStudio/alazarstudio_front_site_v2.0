import React from "react";
import { Link } from "react-router-dom";
import classes from "./Footer.module.css";

const SOCIAL = [
    { label: "Instagram", icon: "/instagram.png", href: "#" },
    { label: "VK", icon: "/vk.png", href: "#" },
];

const LEGAL_LINE1 = [
    "Пользовательское соглашение",
    "Политика конфиденциальности",
    "Согласие на обработку",
    "Политика Cookie",
];

const LEGAL_LINE2 = [];
const OFFICE_REGION = "Карачаево-Черкесская Республика";
const OFFICE_ADDRESS = "г. Черкесск, ул. Кавказская, 56";
const OFFICE_MAP_URL = `https://yandex.ru/maps/?text=${encodeURIComponent(OFFICE_ADDRESS)}`;
const COPYRIGHT_TEXT =
    "Вся информация, представленная на сайте, носит информационный характер и не является публичной офертой, определяемой положениями Статьи 437(2) Гражданского кодекса РФ. Оставаясь на сайте, вы соглашаетесь с условиями Пользовательского соглашения и подтверждаете, что ознакомлены с Политикой обработки персональных данных.";

function Footer() {
    return (
        <footer className={classes.footer}>
            <div className={classes.section}>
                <div className={classes.heroRow}>
                    <div className={classes.brandCol}>
                        <Link to="/" className={classes.logo}>
                            ALAZAR STUDIO
                        </Link>

                        <div className={classes.socialList}>
                            {SOCIAL.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className={classes.socialCircle}
                                    aria-label={social.label}
                                >
                                    <img src={social.icon} alt="" className={classes.socialIcon} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className={classes.contactSide}>
                        <div className={classes.officeCol}>
                            <div className={classes.officeTitle}>{OFFICE_REGION}</div>
                            <a
                                href={OFFICE_MAP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={classes.officeAddress}
                            >
                                {OFFICE_ADDRESS}
                            </a>
                            <a href="tel:+79283995384" className={classes.officePhone}>
                                +7 928 399-53-84
                            </a>
                        </div>

                        <div className={classes.leftCol}>
                            <a href="mailto:info@alazarstudio.ru" className={classes.email}>
                                info@alazarstudio.ru
                            </a>
                            <a href="mailto:info@alazarstudio.com" className={classes.email}>
                                info@alazarstudio.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className={classes.divider} />

            <div className={classes.section}>
                <div className={classes.bottomRow}>
                    <div className={classes.legalWrap}>
                        <div className={classes.legalPills}>
                            {LEGAL_LINE1.map((text, i) => (
                                <a key={i} href="#" className={classes.legalPill}>
                                    {text}
                                </a>
                            ))}
                        </div>
                        {LEGAL_LINE2.length > 0 && (
                            <div className={classes.legalPills}>
                                {LEGAL_LINE2.map((text, i) => (
                                    <a key={i} href="#" className={classes.legalPill}>
                                        {text}
                                    </a>
                                ))}
                            </div>
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
