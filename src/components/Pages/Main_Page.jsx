import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Present_main_block from "../Blocks/Present_main_block/Present_main_block"
import Cases from "../Blocks/Cases/Cases";
import Discuss from "../Blocks/Discuss/Discuss";
import VideoStart from "../Blocks/VideoStart/VideoStart";
import SiteDevGate from '@/components/SiteDevGate'
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, ORG_CONTACT, resolveImageMeta, SITE_BASE_URL, SITE_NAME } from "@/lib/seo";
import { publicCasesAPI, publicNewsAPI, publicStocksAPI } from "@/lib/api";
import { isCaseForShop, mapCaseRecordToCard, mapCaseRecordToShopCard } from "@/components/Blocks/Cases/casesHelpers";
import { isStockActual, mapNewsRecordToCard, mapStockRecordToCard } from "@/components/Blocks/Cases/newsHelpers";
import Work_block from "../Blocks/Work_block/Work_block";
import Scalable_block from "../Blocks/Scalable_block/Scalable_block";

const HOME_PAGE_TITLE = "Alazar Studio — веб-разработка и графический дизайн";
const HOME_PAGE_META_DESCRIPTION = "Alazar — веб-разработка, графический дизайн, реализация цифровых проектов. Полный цикл. Ваши идеи, наше решение.";

function Main_Page({ children, ...props }) {
    const { pathname } = useLocation();
    const isHomePage = pathname === "/";
    const [casesFromApi, setCasesFromApi] = useState([]);
    const [newsFromApi, setNewsFromApi] = useState([]);
    const [stocksFromApi, setStocksFromApi] = useState([]);

    useEffect(() => {
        if (!isHomePage) return undefined;

        let cancelled = false;
        const loadContentSections = async () => {
            try {
                const [casesRes, newsRes, stocksRes] = await Promise.all([
                    publicCasesAPI.getAll({ page: 1, limit: 500 }),
                    publicNewsAPI.getAll({ page: 1, limit: 500 }),
                    publicStocksAPI.getAll({ page: 1, limit: 500 }),
                ]);
                if (cancelled) return;
                setCasesFromApi(Array.isArray(casesRes.data?.cases) ? casesRes.data.cases : []);
                setNewsFromApi(Array.isArray(newsRes.data?.news) ? newsRes.data.news : []);
                setStocksFromApi(Array.isArray(stocksRes.data?.stocks) ? stocksRes.data.stocks : []);
            } catch {
                if (cancelled) return;
                setCasesFromApi([]);
                setNewsFromApi([]);
                setStocksFromApi([]);
            }
        };
        loadContentSections();

        return () => {
            cancelled = true;
        };
    }, [isHomePage]);

    const caseCards = useMemo(
        () => (Array.isArray(casesFromApi) ? casesFromApi.filter((item) => !isCaseForShop(item)).map((item) => mapCaseRecordToCard(item, () => "")) : []),
        [casesFromApi]
    );
    const shopCards = useMemo(
        () => (Array.isArray(casesFromApi) ? casesFromApi.filter((item) => isCaseForShop(item)).map((item) => mapCaseRecordToShopCard(item, () => "")) : []),
        [casesFromApi]
    );
    const newsCards = useMemo(
        () => (Array.isArray(newsFromApi) ? newsFromApi.map(mapNewsRecordToCard) : []),
        [newsFromApi]
    );
    const stockCards = useMemo(
        () => (Array.isArray(stocksFromApi) ? stocksFromApi.filter(isStockActual).map(mapStockRecordToCard) : []),
        [stocksFromApi]
    );

    const homeSchema = useMemo(() => {
        if (!isHomePage) return null;
        const origin = SITE_BASE_URL;
        const pageUrl = `${origin}/`;
        const itemTypeRouteByCardType = {
            case: "/case/",
            new: "/new/",
            shop: "/shopitem/",
            banner: "/banner/",
        };
        const itemSchemaTypeByCardType = {
            case: "CreativeWork",
            new: "Article",
            shop: "Product",
            banner: "Article",
        };
        const toListItems = (items, type) => items
            .filter((item) => item && item.url_text && item.title)
            .map((item, index) => {
                const routePrefix = itemTypeRouteByCardType[item.type || type] || "/";
                const itemUrl = `${origin}${routePrefix}${item.url_text}`;
                const itemNode = {
                    "@type": itemSchemaTypeByCardType[item.type || type] || "Thing",
                    name: String(item.title),
                    url: itemUrl,
                };
                if (item.description) itemNode.description = String(item.description);
                if (item.imgSrc) {
                    const imageMeta = resolveImageMeta({
                        alt: item.imageAlt,
                        caption: item.imageCaption,
                        description: item.imageDescription,
                        title: item.title,
                        fallbackDescription: item.description,
                    });
                    itemNode.image = buildSchemaImageObject({
                        url: item.imgSrc,
                        alt: imageMeta.alt,
                        caption: imageMeta.caption,
                        description: imageMeta.description,
                        title: item.title,
                        fallbackDescription: item.description,
                    }) || String(item.imgSrc);
                }
                return {
                    "@type": "ListItem",
                    position: index + 1,
                    url: itemUrl,
                    item: itemNode,
                };
            });

        const casesItemList = toListItems(caseCards, "case");
        const newsItemList = toListItems(newsCards, "new");
        const shopItemList = toListItems(shopCards, "shop");
        const stocksItemList = toListItems(stockCards, "banner");

        const casesCollectionId = `${pageUrl}#cases-collection`;
        const newsCollectionId = `${pageUrl}#news-collection`;
        const shopCollectionId = `${pageUrl}#shop-collection`;
        const stocksCollectionId = `${pageUrl}#stocks-collection`;
        const casesListId = `${pageUrl}#cases-list`;
        const newsListId = `${pageUrl}#news-list`;
        const shopListId = `${pageUrl}#shop-list`;
        const stocksListId = `${pageUrl}#stocks-list`;

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
                    },
                    hasPart: [
                        { "@id": casesCollectionId },
                        { "@id": newsCollectionId },
                        { "@id": shopCollectionId },
                        { "@id": stocksCollectionId },
                    ],
                    mainEntity: [
                        { "@id": casesListId },
                        { "@id": newsListId },
                        { "@id": shopListId },
                        { "@id": stocksListId },
                    ],
                },
                {
                    "@type": "CollectionPage",
                    "@id": casesCollectionId,
                    name: "Кейсы",
                    url: `${origin}/cases`,
                    isPartOf: { "@id": `${pageUrl}#webpage` },
                    mainEntity: { "@id": casesListId },
                },
                {
                    "@type": "CollectionPage",
                    "@id": newsCollectionId,
                    name: "Новости",
                    url: `${origin}/news`,
                    isPartOf: { "@id": `${pageUrl}#webpage` },
                    mainEntity: { "@id": newsListId },
                },
                {
                    "@type": "CollectionPage",
                    "@id": shopCollectionId,
                    name: "Магазин",
                    url: `${origin}/shop`,
                    isPartOf: { "@id": `${pageUrl}#webpage` },
                    mainEntity: { "@id": shopListId },
                },
                {
                    "@type": "CollectionPage",
                    "@id": stocksCollectionId,
                    name: "Акции",
                    url: `${origin}/`,
                    isPartOf: { "@id": `${pageUrl}#webpage` },
                    mainEntity: { "@id": stocksListId },
                },
                {
                    "@type": "ItemList",
                    "@id": casesListId,
                    name: "Кейсы на главной",
                    numberOfItems: casesItemList.length,
                    itemListElement: casesItemList,
                },
                {
                    "@type": "ItemList",
                    "@id": newsListId,
                    name: "Новости на главной",
                    numberOfItems: newsItemList.length,
                    itemListElement: newsItemList,
                },
                {
                    "@type": "ItemList",
                    "@id": shopListId,
                    name: "Товары и услуги на главной",
                    numberOfItems: shopItemList.length,
                    itemListElement: shopItemList,
                },
                {
                    "@type": "ItemList",
                    "@id": stocksListId,
                    name: "Акции на главной",
                    numberOfItems: stocksItemList.length,
                    itemListElement: stocksItemList,
                },
            ]
        };
    }, [isHomePage, caseCards, newsCards, shopCards, stockCards]);

    useSeo({
        enabled: isHomePage,
        title: HOME_PAGE_TITLE,
        description: HOME_PAGE_META_DESCRIPTION,
        pathname: "/",
        robots: "index,follow",
        ogType: "website",
        ogImage: "/alazar-logo.png",
        ogImageAlt: "Логотип Alazar Studio",
        schema: homeSchema,
        schemaId: "schema-main-page",
    });

    return (
        <>
            <Present_main_block />
            {/* <Scalable_block /> */}
            {/* <Work_block /> */}
            {/* <VideoStart /> */}
            <Cases />
            <Discuss />
        </>
    );
}

export default Main_Page;

