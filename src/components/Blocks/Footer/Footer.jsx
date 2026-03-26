import React from "react";
import { Link } from "react-router-dom";
import classes from "./Footer.module.css";

const SOCIAL = [
    { label: "Instagram", icon: "/instagram.png" },
    { label: "VK", icon: "/vk.png" },
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

                        <nav className={classes.socialList} aria-label="Социальные сети">
                            {SOCIAL.map((social) => (
                                <span
                                    key={social.label}
                                    className={classes.socialCircle}
                                    aria-label={social.label}
                                >
                                    <img src={social.icon} alt="" className={classes.socialIcon} aria-hidden="true" />
                                </span>
                            ))}
                        </nav>
                    </div>

                    <address className={classes.contactSide}>
                        <div className={classes.officeCol}>
                            <p className={classes.officeTitle}>{OFFICE_REGION}</p>
                            <a
                                href={OFFICE_MAP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={classes.officeAddress}
                            >
                                {OFFICE_ADDRESS}
                            </a>
                        </div>

                        <div className={classes.leftCol}>
                            <a href="mailto:info@alazarstudio.ru" className={classes.email}>
                                info@alazarstudio.ru
                            </a>
                            <a href="tel:+79283995384" className={classes.officePhone}>
                                +7 928 399-53-84
                            </a>
                        </div>
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
