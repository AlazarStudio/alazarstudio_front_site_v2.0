import React from "react";
import { Link } from "react-router-dom";
import classes from "./Footer.module.css";

const SOCIAL = [
    { label: "Behance", letter: "B" },
    { label: "GitHub", letter: "G" },
    { label: "VK", letter: "V" },
    { label: "Telegram", letter: "T" },
    { label: "Youtube", letter: "Y" },
    { label: "Red Basset", letter: "R" },
];

const LEGAL_LINE1 = [
    "Пользовательское соглашение",
    "Политика конфиденциальности",
    "Согласие на обработку",
    "Сведения о СОУТ",
];
const LEGAL_LINE2 = ["Ценовая политика", "Политика Cookie"];

function Footer() {
    return (
        <footer className={classes.footer}>
            {/* Верхняя секция: логотип mish + соцсети в два ряда */}
            <div className={classes.section}>
                <div className={classes.topRow}>
                    <Link to="/" className={classes.logo}>
                        <img src="/alazar-logo.png" alt="ALAZAR STUDIO" />
                    </Link>
                    <div className={classes.socialWrap}>
                        <div className={classes.socialRow}>
                            {SOCIAL.slice(0, 4).map((s, i) => (
                                <a key={i} href="#" className={classes.socialPill} aria-label={s.label}>
                                    <span className={classes.socialLetter}>{s.letter}</span>
                                    <span className={classes.socialLabel}>{s.label}</span>
                                </a>
                            ))}
                        </div>
                        <div className={classes.socialRow}>
                            {SOCIAL.slice(4, 6).map((s, i) => (
                                <a key={i} href="#" className={classes.socialPill} aria-label={s.label}>
                                    <span className={classes.socialLetter}>{s.letter}</span>
                                    <span className={classes.socialLabel}>{s.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className={classes.divider} />

            {/* Средняя секция: три колонки — email+кнопка | Москва | Нижний Новгород */}
            <div className={classes.section}>
                <div className={classes.middleRow}>
                    <div className={classes.leftCol}>
                        <a href="mailto:hello@mish.design" className={classes.email}>
                            hello@mish.design
                        </a>
                        <Link to="/contacts" className={classes.reviewBtn}>
                            Оставить отзыв
                        </Link>
                    </div>

                    <div className={classes.officeCol}>
                        <div className={classes.officeTitle}>Карачаево-Черкесская Республика</div>
                        <div className={classes.officeAddress}>г. Черкесск, ул. Кавказская, 56</div>
                        <a href="tel:+79283995384" className={classes.officePhone}>
                            +7 928 399-53-84
                        </a>
                    </div>
                </div>
            </div>

            <div className={classes.divider} />

            {/* Юридические ссылки в два ряда + блок Резидент */}
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
                        <div className={classes.legalPills}>
                            {LEGAL_LINE2.map((text, i) => (
                                <a key={i} href="#" className={classes.legalPill}>
                                    {text}
                                </a>
                            ))}
                        </div>
                    </div>
                    {/* <div className={classes.residentBlock}>
                        <span className={classes.residentLine1}>Резидент</span>
                        <span className={classes.residentIcon} aria-hidden>
                            ○ ○ ○
                        </span>
                        <span className={classes.residentLine2}>ИНТЦ</span>
                        <span className={classes.residentLine2}>КВАНТОВАЯ ДОЛИНА</span>
                    </div> */}
                </div>
            </div>

            <div className={classes.divider} />

            {/* Копирайт и дисклеймер */}
            <div className={classes.section}>
                <div className={classes.copyright}>
                    Информация на сайте не является публичной офертой. Пользовательское соглашение и
                    Политика обработки персональных данных доступны по ссылкам выше. Сведения о
                    специальной оценке условий труда (СОУТ). © 2018-2026, ООО МИШ ДИЗАЙН. ОГРН, ИНН,
                    ОКВЭД и направления деятельности согласно приказу Министерства цифрового
                    развития.
                </div>
            </div>
        </footer>
    );
}

export default Footer;
