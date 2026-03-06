import React, { useState, useEffect, useRef } from "react";
import classes from './Header.module.css';
import { Link, useLocation } from "react-router-dom";

function Header({ children, ...props }) {
    const [hasBackground, setHasBackground] = useState(false);
    const [hoveredLinkKey, setHoveredLinkKey] = useState(null);
    const [leavingLinkKeys, setLeavingLinkKeys] = useState([]);
    const leaveTimersRef = useRef({});
    const hoverStartedAtRef = useRef({});
    const { pathname } = useLocation();

    const section = pathname.split("/")[1] || "/";
    const isHome = pathname === '/' || pathname.startsWith('/case/') || pathname.startsWith('/new/') || pathname.startsWith('/banner/') || pathname.startsWith('/shopitem/');
    const isBlog = pathname === '/news' || pathname.startsWith('/news/');
    const isShop = pathname === '/shop' || pathname.startsWith('/shop/');
    const isCases = pathname === '/cases' || pathname.startsWith('/cases/');
    const isAbout = pathname === '/about' || pathname.startsWith('/about/');
    const isContacts = pathname === '/contacts' || pathname.startsWith('/contacts/');


    let scrollNumber = 50
    if (section == 'news') {
        scrollNumber = 100
    }
    if (section == 'shop') {
        scrollNumber = 100
    }
    if (section == 'cases') {
        scrollNumber = 100
    }

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            setHasBackground(scrollPosition > scrollNumber);
        };

        // Проверяем начальную позицию
        handleScroll();

        // Добавляем обработчик события скролла
        window.addEventListener('scroll', handleScroll);

        // Очищаем обработчик при размонтировании / смене маршрута
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrollNumber]);

    useEffect(() => {
        return () => {
            Object.values(leaveTimersRef.current).forEach((timerId) => {
                clearTimeout(timerId);
            });
            leaveTimersRef.current = {};
        };
    }, []);

    const handleLinkEnter = (key) => {
        hoverStartedAtRef.current[key] = Date.now();

        const activeTimer = leaveTimersRef.current[key];
        if (activeTimer) {
            clearTimeout(activeTimer);
            delete leaveTimersRef.current[key];
        }

        setLeavingLinkKeys((prev) => prev.filter((item) => item !== key));
        setHoveredLinkKey(key);
    };

    const handleLinkLeave = (key, shouldRunLeaveAnimation = true) => {
        setHoveredLinkKey((prev) => (prev === key ? null : prev));

        if (!shouldRunLeaveAnimation) {
            setLeavingLinkKeys((prev) => prev.filter((item) => item !== key));
            return;
        }

        setLeavingLinkKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));

        const existingTimer = leaveTimersRef.current[key];
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        leaveTimersRef.current[key] = setTimeout(() => {
            setLeavingLinkKeys((prev) => prev.filter((item) => item !== key));
            delete leaveTimersRef.current[key];
        }, 760);
    };

    const navItems = [
        { key: 'home', to: '/', label: 'Главная', active: isHome },
        { key: 'cases', to: '/cases', label: 'Кейсы', active: isCases },
        { key: 'news', to: '/news', label: 'Блог', active: isBlog },
        { key: 'shop', to: '/shop', label: 'Магазин', active: isShop },
        { key: 'about', to: '/about', label: 'О нас', active: isAbout },
        { key: 'contacts', to: '/contacts', label: 'Контакты', active: isContacts },
    ];

    return (
        <header className={`${classes.header} ${hasBackground ? classes.header_withBackground : ''}`}>
            {/* <div className={'centerBlock'}> */}
            <div className={classes.widthlogo}>
                <Link to={'/'}><img src="/alazar-logo.png" alt="Alazar Studio logo" /></Link>
            </div>
            <div className={classes.header_links}>
                {navItems.map((item) => (
                    <Link
                        key={item.key}
                        to={item.to}
                        data-text={item.label}
                        onMouseEnter={() => handleLinkEnter(item.key)}
                        onMouseLeave={() => handleLinkLeave(item.key, !item.active)}
                        className={[
                            item.active ? classes.linkActive : '',
                            !item.active && hoveredLinkKey === item.key ? classes.linkHovering : '',
                            !item.active && leavingLinkKeys.includes(item.key) ? classes.linkLeaving : '',
                            hoveredLinkKey && hoveredLinkKey !== item.key ? classes.linkDimmed : '',
                        ].filter(Boolean).join(' ')}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
            <div className={classes.header_contact_btns}>
                <Link to="tel:+79283995384" className={classes.header_contact_btn}>8 (928) 399-53-84</Link>
                <Link to="mailto:info@alazarstudio.ru" className={classes.header_contact_btn}>info@alazarstudio.ru</Link>
            </div>

            {/* <div className={classes.header_links_user}>
                    <Link to={'/card'}><img src="/card.png" alt="" /></Link>
                    <Link to={'/profile'}><img src="/profile.png" alt="" /></Link>
                </div> */}
            {/* </div> */}
        </header>
    );
}

export default Header;