import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ContactMailRoundedIcon from "@mui/icons-material/ContactMailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import classes from "./Header.module.css";
import { publicContactsAPI } from "@/lib/api";
import ContactModal from "../Cases/ContactModal";

const DEFAULT_PHONE = "8 (928) 399-53-84";
const DEFAULT_PHONE_LINK = "+79283995384";
const DEFAULT_EMAIL = "info@alazarstudio.ru";
const MOBILE_BREAKPOINT = "(max-width: 767px)";

function Header() {
    const [hasBackground, setHasBackground] = useState(false);
    const [contact, setContact] = useState(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await publicContactsAPI.get();
                if (cancelled) return;

                const list = res.data?.contacts;
                if (Array.isArray(list) && list.length > 0) {
                    const first = list.find((item) => item.isPublished !== false) ?? list[0];
                    setContact(first);
                }
            } catch {
                if (!cancelled) {
                    setContact(null);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!mobileMenuOpen || typeof document === "undefined") return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        if (
            !mobileMenuOpen ||
            typeof window === "undefined" ||
            typeof document === "undefined" ||
            !window.matchMedia(MOBILE_BREAKPOINT).matches
        ) {
            return undefined;
        }

        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = overflow;
        };
    }, [mobileMenuOpen]);

    const phoneDisplay = contact?.nomer ?? DEFAULT_PHONE;
    const phoneLink = contact?.nomer != null
        ? contact.nomer.replace(/\D/g, "") || DEFAULT_PHONE_LINK
        : DEFAULT_PHONE_LINK;
    const email = contact?.e_mail ?? DEFAULT_EMAIL;

    const section = pathname.split("/")[1] || "/";
    const isHome = pathname === "/" || pathname.startsWith("/case/") || pathname.startsWith("/new/") || pathname.startsWith("/banner/") || pathname.startsWith("/shopitem/");
    const isBlog = pathname === "/news" || pathname.startsWith("/news/");
    const isShop = pathname === "/shop" || pathname.startsWith("/shop/");
    const isCases = pathname === "/cases" || pathname.startsWith("/cases/");
    const isAbout = pathname === "/about" || pathname.startsWith("/about/");
    const isContacts = pathname === "/contacts" || pathname.startsWith("/contacts/");

    let scrollNumber = 50;
    if (["news", "shop", "cases"].includes(section)) {
        scrollNumber = 100;
    }

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            setHasBackground(scrollPosition > scrollNumber);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [scrollNumber]);

    const navItems = [
        { key: "home", to: "/", label: "Главная", active: isHome, icon: HomeRoundedIcon },
        { key: "cases", to: "/cases", label: "Кейсы", active: isCases, icon: WorkOutlineRoundedIcon },
        { key: "news", to: "/news", label: "Блог", active: isBlog, icon: ArticleRoundedIcon },
        { key: "shop", to: "/shop", label: "Магазин", active: isShop, icon: StorefrontRoundedIcon },
        { key: "about", to: "/about", label: "О нас", active: isAbout, icon: InfoOutlinedIcon },
        { key: "contacts", to: "/contacts", label: "Контакты", active: isContacts, icon: ContactMailRoundedIcon },
    ];

    const contactItems = [
        { key: "phone", href: `tel:${phoneLink}`, label: phoneDisplay, icon: PhoneRoundedIcon },
        { key: "email", href: `mailto:${email}`, label: email, icon: AlternateEmailRoundedIcon },
    ];

    const handleRequestClick = () => {
        setMobileMenuOpen(false);
        setContactModalOpen(true);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    return (
        <header className={`${classes.header} ${(hasBackground || mobileMenuOpen) ? classes.header_withBackground : ""}`}>
            <div className={classes.header_main}>
                <div className={classes.widthlogo}>
                    <Link to="/" className={classes.logoLink} onClick={closeMobileMenu}>
                        <img src="/alazar-logo.png" alt="Alazar Studio logo" className={classes.logoDesktop} />
                        <img src="/big_a.svg" alt="Alazar Studio logo" className={classes.logoMobile} />
                    </Link>
                </div>

                <nav className={classes.header_links} aria-label="Основная навигация">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.key}
                                to={item.to}
                                className={item.active ? classes.linkActive : ""}
                                aria-label={item.label}
                                title={item.label}
                            >
                                <span className={classes.linkIcon} aria-hidden="true">
                                    <Icon fontSize="inherit" />
                                </span>
                                <span className={classes.linkLabel}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={classes.header_contact_btns}>
                    {contactItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                className={classes.header_contact_btn}
                                aria-label={item.label}
                                title={item.label}
                            >
                                <span className={classes.contactBtnIcon} aria-hidden="true">
                                    <Icon fontSize="inherit" />
                                </span>
                                <span className={classes.contactBtnLabel}>{item.label}</span>
                            </a>
                        );
                    })}

                    <button
                        type="button"
                        className={classes.header_request_btn}
                        onClick={handleRequestClick}
                        aria-label="Оставить заявку"
                        title="Оставить заявку"
                    >
                        <span className={classes.requestBtnIcon} aria-hidden="true">
                            <EditNoteRoundedIcon fontSize="inherit" />
                        </span>
                        <span className={classes.requestBtnLabel}>Оставить заявку</span>
                    </button>
                </div>

                <button
                    type="button"
                    className={classes.mobileMenuToggle}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-header-menu"
                    aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                >
                    <img src="/coolicon.png" alt="" aria-hidden="true" />
                </button>
            </div>

            <div
                id="mobile-header-menu"
                className={`${classes.mobileMenu} ${mobileMenuOpen ? classes.mobileMenuOpen : ""}`}
            >
                <nav className={classes.mobileNav} aria-label="Мобильная навигация">
                    {navItems.map((item) => (
                        <Link
                            key={item.key}
                            to={item.to}
                            onClick={closeMobileMenu}
                            className={`${classes.mobileMenuLink} ${item.active ? classes.mobileMenuLinkActive : ""}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className={classes.mobileContacts}>
                    {contactItems.map((item) => (
                        <a
                            key={item.key}
                            href={item.href}
                            className={classes.mobileContactBtn}
                            onClick={closeMobileMenu}
                        >
                            {item.label}
                        </a>
                    ))}
                    <button type="button" className={classes.mobileRequestBtn} onClick={handleRequestClick}>
                        Оставить заявку
                    </button>
                </div>
            </div>

            {typeof document !== "undefined"
                ? createPortal(
                    <ContactModal
                        isOpen={contactModalOpen}
                        onClose={() => setContactModalOpen(false)}
                        nested={false}
                    />,
                    document.body
                )
                : null}
        </header>
    );
}

export default Header;
