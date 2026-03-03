import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import classes from "./Layout.module.css";

import Header from "../../Blocks/Header/Header"
import Footer from "../../Blocks/Footer/Footer";
import CustomCursor from "../../Cursor/CustomCursor";

const PAGE_LOADER_DURATION_MS = 450;

function getPageKey(pathname, locationState) {
    const modalBackground = typeof locationState?.modalBackground === "string"
        ? locationState.modalBackground
        : "";
    const isModalPath = /^\/(case|new|banner|shopitem)\/[^/]+$/.test(pathname);

    // Если это модальный URL с фоновой страницей, не считаем это переходом страницы.
    if (isModalPath && modalBackground) {
        return getPageKey(modalBackground, null);
    }

    if (pathname === "/") return "home";
    if (pathname.startsWith("/cases")) return "cases";
    if (pathname.startsWith("/news")) return "news";
    if (pathname.startsWith("/shop")) return "shop";
    if (pathname.startsWith("/about")) return "about";
    if (pathname.startsWith("/contacts")) return "contacts";

    // Модальные URL на главной должны считаться частью главной страницы
    if (/^\/(case|new|banner|shopitem)\/[^/]+$/.test(pathname)) return "home";

    return pathname;
}

function Empty({ children, ...props }) {
    const location = useLocation();
    const [isPageTransitionLoading, setIsPageTransitionLoading] = useState(true);
    const loaderTimerRef = useRef(null);
    const currentPageKey = useMemo(
        () => getPageKey(location.pathname, location.state),
        [location.pathname, location.state]
    );
    const previousPageKeyRef = useRef(currentPageKey);

    useEffect(() => {
        const previousPageKey = previousPageKeyRef.current;
        if (previousPageKey === currentPageKey) return;

        previousPageKeyRef.current = currentPageKey;

        // При реальной смене страницы сразу поднимаем в начало
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        setIsPageTransitionLoading(true);

        if (loaderTimerRef.current) {
            window.clearTimeout(loaderTimerRef.current);
        }
        loaderTimerRef.current = window.setTimeout(() => {
            setIsPageTransitionLoading(false);
            loaderTimerRef.current = null;
        }, PAGE_LOADER_DURATION_MS);
    }, [currentPageKey]);

    useEffect(() => {
        if (loaderTimerRef.current) {
            window.clearTimeout(loaderTimerRef.current);
        }
        loaderTimerRef.current = window.setTimeout(() => {
            setIsPageTransitionLoading(false);
            loaderTimerRef.current = null;
        }, PAGE_LOADER_DURATION_MS);
    }, []);

    useEffect(() => {
        return () => {
            if (loaderTimerRef.current) {
                window.clearTimeout(loaderTimerRef.current);
            }
        };
    }, []);

    return (
        <>
            <CustomCursor />
            <Header/>
            <Outlet />
            <Footer/>
            {isPageTransitionLoading && (
                <div className={classes.pageLoaderOverlay} aria-hidden="true">
                    <div className={classes.pageLoaderContent}>
                        <div className={classes.pageLoaderLogoWrap}>
                            <img src="/alazar-logo.png" alt="Alazar Studio" className={classes.pageLoaderLogo} />
                        </div>
                        <div className={classes.pageLoaderSpinner}></div>
                        <p className={classes.pageLoaderText}>Все загружаем, скоро появится</p>
                    </div>
                </div>
            )}
        </>
    );
}

export default Empty;