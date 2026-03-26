import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Present_main_block from "../Blocks/Present_main_block/Present_main_block"
import Cases from "../Blocks/Cases/Cases";
import Discuss from "../Blocks/Discuss/Discuss";
import VideoStart from "../Blocks/VideoStart/VideoStart";
import SiteDevGate from '@/components/SiteDevGate'

const HOME_PAGE_TITLE = "Alazar Studio — веб – разработка и графический дизайн";
const HOME_PAGE_META_DESCRIPTION = "Alazar — веб-разработка, графический дизайн, реализация цифровых проектов. Полный цикл. Ваши идеи, наше решение.";

function Main_Page({ children, ...props }) {
    const { pathname } = useLocation();
    const isHomePage = pathname === "/";

    const homeSchema = useMemo(() => {
        if (!isHomePage || typeof window === "undefined") return null;

        const origin = window.location.origin;
        const pageUrl = `${origin}/`;

        return {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": `${origin}/#organization`,
                    name: "ALAZAR STUDIO",
                    url: origin,
                    description: "Комплексные цифровые решения под ключ: от идеи до готового продукта с последующей поддержкой"
                },
                {
                    "@type": "WebSite",
                    "@id": `${origin}/#website`,
                    url: origin,
                    name: "ALAZAR STUDIO",
                    publisher: {
                        "@id": `${origin}/#organization`
                    }
                },
                {
                    "@type": "WebPage",
                    "@id": `${pageUrl}#webpage`,
                    url: pageUrl,
                    name: "ALAZAR STUDIO - Главная",
                    description: HOME_PAGE_META_DESCRIPTION,
                    isPartOf: {
                        "@id": `${origin}/#website`
                    },
                    about: {
                        "@id": `${origin}/#organization`
                    }
                }
            ]
        };
    }, [isHomePage]);

    useEffect(() => {
        if (!isHomePage || typeof document === "undefined") return undefined;

        const prevTitle = document.title;
        document.title = HOME_PAGE_TITLE;

        let metaDescription = document.querySelector('meta[name="description"]');
        const hadMetaDescription = Boolean(metaDescription);

        if (!metaDescription) {
            metaDescription = document.createElement("meta");
            metaDescription.setAttribute("name", "description");
            document.head.appendChild(metaDescription);
        }

        const prevDescription = metaDescription.getAttribute("content");
        metaDescription.setAttribute("content", HOME_PAGE_META_DESCRIPTION);

        return () => {
            document.title = prevTitle;

            if (!metaDescription) return;

            if (hadMetaDescription) {
                if (prevDescription !== null) {
                    metaDescription.setAttribute("content", prevDescription);
                } else {
                    metaDescription.removeAttribute("content");
                }
                return;
            }

            metaDescription.remove();
        };
    }, [isHomePage]);

    useEffect(() => {
        if (!homeSchema) return undefined;

        const scriptId = "schema-main-page";
        let script = document.getElementById(scriptId);

        if (!script) {
            script = document.createElement("script");
            script.type = "application/ld+json";
            script.id = scriptId;
            document.head.appendChild(script);
        }

        script.textContent = JSON.stringify(homeSchema);

        return () => {
            const currentScript = document.getElementById(scriptId);
            if (currentScript) currentScript.remove();
        };
    }, [homeSchema]);

    return (
        <>
            <Present_main_block />
            {/* <VideoStart /> */}
            <Cases />
            <Discuss />
        </>
    );
}

export default Main_Page;

