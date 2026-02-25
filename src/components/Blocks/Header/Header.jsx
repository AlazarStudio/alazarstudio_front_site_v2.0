import React, { useState, useEffect } from "react";
import classes from './Header.module.css';
import { Link, useLocation } from "react-router-dom";

function Header({ children, ...props }) {
    const [hasBackground, setHasBackground] = useState(false);
    const { pathname } = useLocation();
    const section = pathname.split("/")[1] || "/";

    
    let scrollNumber = 400
    if (section == 'news'){
        scrollNumber = 100
    }
    if (section == 'shop'){
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

    return (
        <header className={`${classes.header} ${hasBackground ? classes.header_withBackground : ''}`}>
            <div className={'centerBlock'}>
                <Link to={'/'}><img src="/alazar-logo.png" alt="Alazar Studio logo" /></Link>

                <div className={classes.header_links}>
                    {/* <Link to={'/'}>Главная</Link> */}
                    <Link to={'/'}>Кейсы</Link>
                    <Link to={'/news'}>Блог</Link>
                    <Link to={'/shop'}>Магазин</Link>
                    <Link to={'/about'}>О нас</Link>
                    <Link to={'/contacts'}>Контакты</Link>
                </div>

                {/* <div className={classes.header_links_user}>
                    <Link to={'/card'}><img src="/card.png" alt="" /></Link>
                    <Link to={'/profile'}><img src="/profile.png" alt="" /></Link>
                </div> */}
            </div>
        </header>
    );
}

export default Header;