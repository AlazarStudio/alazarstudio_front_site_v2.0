import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import Present_main_block from "../Blocks/Present_main_block/Present_main_block"
import Cases from "../Blocks/Cases/Cases";
import Discuss from "../Blocks/Discuss/Discuss";
import VideoStart from "../Blocks/VideoStart/VideoStart";
import SiteDevGate from '@/components/SiteDevGate'
import { useSeo } from "@/hooks/useSeo";
import { ORG_CONTACT, SITE_BASE_URL, SITE_NAME } from "@/lib/seo";

const HOME_PAGE_TITLE = "Alazar Studio — веб-разработка и графический дизайн";
const HOME_PAGE_META_DESCRIPTION = "Alazar — веб-разработка, графический дизайн, реализация цифровых проектов. Полный цикл. Ваши идеи, наше решение.";

function Main_Page({ children, ...props }) {
    const { pathname } = useLocation();
    const isHomePage = pathname === "/";

    const homeSchema = useMemo(() => {
        if (!isHomePage) return null;
        const origin = SITE_BASE_URL;
        const pageUrl = `${origin}/`;

        return {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": `${origin}/#organization`,
                    name: SITE_NAME,
                    alternateName: "Алазар",
                    url: pageUrl,
                    logo: `${origin}/alazar-logo.png`,
                    description: "Студия web-разработки и графического дизайна.",
                    email: ORG_CONTACT.email,
                    telephone: ORG_CONTACT.telephone
                },
                {
                    "@type": "WebSite",
                    "@id": `${origin}/#website`,
                    url: pageUrl,
                    name: SITE_NAME,
                    publisher: {
                        "@id": `${origin}/#organization`
                    }
                },
                {
                    "@type": "WebPage",
                    "@id": `${pageUrl}#webpage`,
                    url: pageUrl,
                    name: `Главная | ${SITE_NAME}`,
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

    useSeo({
        enabled: isHomePage,
        title: HOME_PAGE_TITLE,
        description: HOME_PAGE_META_DESCRIPTION,
        pathname: "/",
        robots: "index,follow",
        ogType: "website",
        ogImage: "/alazar-logo.png",
        schema: homeSchema,
        schemaId: "schema-main-page",
    });

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

