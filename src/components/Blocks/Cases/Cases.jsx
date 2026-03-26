import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import classes from './Cases.module.css';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import Modal from '../../Standart/Modal/Modal.jsx';
import CaseCard from "../CaseCard/CaseCard.jsx";
import CaseDetailsModal from './CaseDetailsModal';
import caseDetailsModalClasses from './CaseDetailsModal.module.css';
import NewsDetailsModal from './NewsDetailsModal';
import ShopDetailsModal from './ShopDetailsModal';
import { extractPlainText, extractTagRelations, isCaseForShop, mapCaseRecordToCard, mapCaseRecordToShopCard } from '@/components/Blocks/Cases/casesHelpers';
import { isStockActual, mapNewsRecordToCard, mapStockRecordToCard } from '@/components/Blocks/Cases/newsHelpers';
import { publicCasesAPI, publicDynamicPageRecordsAPI, publicNewsAPI, publicStocksAPI, publicTeamAPI } from '@/lib/api';
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, resolveImageMeta, SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";
import NotFound from "@/app/NotFound";

function Cases({ children, ...props }) {
    const { filterCategories, filterLoading } = useSiteFilterCategories();
    // Состояния для фильтрации (по умолчанию "Все")
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTag, setSelectedTag] = useState(null); // По умолчанию ничего не выбрано (одиночный выбор)
    const [selectedType, setSelectedType] = useState(null); // По умолчанию ничего не выбрано (одиночный выбор)
    const [isFilterVisible, setIsFilterVisible] = useState(true); // Видимость оригинального фильтра
    const [isLoading, setIsLoading] = useState(false); // Состояние загрузки
    const [isCasesEnded, setIsCasesEnded] = useState(false); // Достиг ли пользователь конца кейсов
    const [isModalOpen, setIsModalOpen] = useState(false); // Состояние модального окна
    const [selectedItem, setSelectedItem] = useState(null); // Выбранный элемент для модального окна
    const [casesFromApi, setCasesFromApi] = useState([]);
    const [newsFromApi, setNewsFromApi] = useState([]);
    const [stocksFromApi, setStocksFromApi] = useState([]);
    const [teamFromApi, setTeamFromApi] = useState([]);
    const [relatedTagLabelsByKey, setRelatedTagLabelsByKey] = useState({});
    const [isCasesLoaded, setIsCasesLoaded] = useState(false);
    const navigate = useNavigate();
    const resolveRelatedTagLabel = useMemo(
        () => (id, resourceSlug = '') => relatedTagLabelsByKey[`${String(resourceSlug || '').toLowerCase()}:${String(id)}`] || '',
        [relatedTagLabelsByKey]
    );
    const casesData = useMemo(
        () => (Array.isArray(casesFromApi)
            ? casesFromApi
                .filter((item) => !isCaseForShop(item))
                .map((item) => mapCaseRecordToCard(item, resolveRelatedTagLabel))
            : []),
        [casesFromApi, resolveRelatedTagLabel]
    );
    const shopData = useMemo(
        () => (Array.isArray(casesFromApi)
            ? casesFromApi
                .filter((item) => isCaseForShop(item))
                .map((item) => mapCaseRecordToShopCard(item, resolveRelatedTagLabel))
            : []),
        [casesFromApi, resolveRelatedTagLabel]
    );
    const newsData = useMemo(
        () => (Array.isArray(newsFromApi) ? newsFromApi.map(mapNewsRecordToCard) : []),
        [newsFromApi]
    );
    const bannersData = useMemo(
        () => (Array.isArray(stocksFromApi) ? stocksFromApi.filter(isStockActual).map(mapStockRecordToCard) : []),
        [stocksFromApi]
    );

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [casesRes, newsRes, stocksRes, teamRes] = await Promise.all([
                    publicCasesAPI.getAll({ page: 1, limit: 500 }),
                    publicNewsAPI.getAll({ page: 1, limit: 500 }),
                    publicStocksAPI.getAll({ page: 1, limit: 500 }),
                    publicTeamAPI.getAll({ page: 1, limit: 500 }),
                ]);
                if (cancelled) return;
                setCasesFromApi(Array.isArray(casesRes.data?.cases) ? casesRes.data.cases : []);
                setNewsFromApi(Array.isArray(newsRes.data?.news) ? newsRes.data.news : []);
                setStocksFromApi(Array.isArray(stocksRes.data?.stocks) ? stocksRes.data.stocks : []);
                setTeamFromApi(Array.isArray(teamRes.data?.team) ? teamRes.data.team : []);
            } catch (error) {
                if (cancelled) return;
                setCasesFromApi([]);
                setNewsFromApi([]);
                setStocksFromApi([]);
                setTeamFromApi([]);
            } finally {
                if (!cancelled) setIsCasesLoaded(true);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadRelatedTagLabels = async () => {
            const relationMap = new Map();
            (Array.isArray(casesFromApi) ? casesFromApi : []).forEach((record) => {
                extractTagRelations(record).forEach(({ resourceSlug, id }) => {
                    const slug = String(resourceSlug || '').trim().toLowerCase();
                    if (!slug || !id) return;
                    if (!relationMap.has(slug)) relationMap.set(slug, new Set());
                    relationMap.get(slug).add(String(id));
                });
            });

            if (relationMap.size === 0) {
                if (!cancelled) setRelatedTagLabelsByKey({});
                return;
            }

            const requests = Array.from(relationMap.entries()).map(async ([slug, ids]) => {
                try {
                    const response = await publicDynamicPageRecordsAPI.getAll(slug, { page: 1, limit: 2000 });
                    const records = Array.isArray(response.data?.records) ? response.data.records : [];
                    const result = {};
                    records.forEach((item) => {
                        const itemId = String(item?.id || item?._id?.$oid || item?._id || '').trim();
                        if (!itemId || !ids.has(itemId)) return;
                        const label = extractPlainText(item?.nazvanie || item?.name || item?.title || item?.label || item?.value);
                        if (label) result[`${slug}:${itemId}`] = label;
                    });
                    return result;
                } catch {
                    return {};
                }
            });

            const resolved = await Promise.all(requests);
            if (cancelled) return;
            const nextMap = {};
            resolved.forEach((part) => Object.assign(nextMap, part));
            setRelatedTagLabelsByKey(nextMap);
        };

        loadRelatedTagLabels();
        return () => {
            cancelled = true;
        };
    }, [casesFromApi]);

    const location = useLocation();
    const { type: routeType, url_text: routeUrlText } = useParams();
    const filterRef = useRef(null);
    const casesRef = useRef(null);
    const casesContainerRef = useRef(null);

    const findItemByUrlText = (urlText) => {
        if (!urlText) return null;
        const allItems = [...casesData, ...newsData, ...shopData, ...bannersData];
        return allItems.find((x) => String(x.url_text) === String(urlText)) || null;
    };

    const normalizeEntityType = (value) => {
        const type = String(value || '').toLowerCase();
        if (type === 'news') return 'new';
        if (type === 'stock' || type === 'stocks') return 'banner';
        if (type === 'shop-item' || type === 'shopcase' || type === 'shopitem') return 'shop';
        return type;
    };

    const buildItemRoute = (item) => {
        const normalizedType = normalizeEntityType(item?.type);
        const slug = String(item?.url_text || '').trim();
        if (!normalizedType || !slug) return null;

        if (normalizedType === 'case') return `/case/${slug}`;
        if (normalizedType === 'new') return `/new/${slug}`;
        if (normalizedType === 'banner') return `/banner/${slug}`;
        if (normalizedType === 'shop') return `/shopitem/${slug}`;
        return `/${normalizedType}/${slug}`;
    };

    // Отслеживание видимости фильтра и конца кейсов при скролле
    useEffect(() => {
        const handleScroll = () => {
            if (filterRef.current) {
                const rect = filterRef.current.getBoundingClientRect();
                // Проверяем, скрылся ли фильтр с экрана (ниже видимой области)
                setIsFilterVisible(rect.bottom > 0);
            }

            // Проверяем, достиг ли пользователь 60% экрана
            if (casesContainerRef.current) {
                const containerRect = casesContainerRef.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const threshold = windowHeight * 0.3; // 20% экрана
                // Если нижняя часть контейнера с кейсами прошла 20% экрана
                setIsCasesEnded(containerRect.bottom <= threshold);
            }
        };

        // Проверяем начальную позицию
        handleScroll();

        // Добавляем обработчик события скролла
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        // Очищаем обработчики при размонтировании
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    // Показ лоадера при изменении типа или тега (не при изменении категории)
    useEffect(() => {
        // Показываем лоадер только при изменении типа или тега
        if (selectedType !== null || selectedTag !== null) {
            setIsLoading(true);

            // Показываем лоадер на 1 секунду
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1000);

            return () => clearTimeout(timer);
        } else {
            setIsLoading(false);
        }
    }, [selectedType, selectedTag]);

    // Прокрутка к началу фильтров при выборе типа или тега
    useEffect(() => {
        if ((selectedType !== null || selectedTag !== null) && filterRef.current) {
            const filterElement = filterRef.current;
            const elementPosition = filterElement.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 100; // Отступ сверху для header

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }, [selectedType, selectedTag]);

    // Обработчик выбора категории
    const handleCategorySelect = (category) => {
        // Если нажимаем на уже выбранную категорию, сбрасываем все фильтры
        if (category === selectedCategory) {
            setSelectedCategory(null);
            setSelectedType(null);
            setSelectedTag(null);
        } else {
            setSelectedCategory(category);
            setSelectedTag(null);
            setSelectedType(null); // Сбрасываем тип при смене категории (включая "Все")
        }
    };

    // Обработчик выбора тега (одиночный выбор)
    const handleTagSelect = (tag) => {
        // Если выбран тот же тег, снимаем выбор
        setSelectedTag(prev => prev === tag ? null : tag);
    };

    // Обработчик выбора типа (одиночный выбор)
    const handleTypeSelect = (type) => {
        // Если выбран тот же тип, снимаем выбор
        setSelectedType(prev => prev === type ? null : type);
    };

    // Функция фильтрации данных
    const filterData = (data) => {
        let filtered = data;

        // Фильтруем по типу только для категории "Все" и если тип выбран
        if (selectedCategory === 'all' && selectedType !== null) {
            filtered = filtered.filter(item => item.type === selectedType);
        }

        // Затем фильтруем по тегу, если он выбран
        if (selectedTag !== null) {
            filtered = filtered.filter(item => {
                // Проверяем, есть ли выбранный тег в тегах элемента
                return item.tags.includes(selectedTag);
            });
        }

        return filtered;
    };

    const createRows = () => {
        const rows = [];

        const filteredCasesData = filterData(casesData);
        const filteredNewsData = filterData(newsData);
        const filteredShopData = filterData(shopData);
        const filteredBannersData = filterData(bannersData);

        const allData = [...filteredCasesData, ...filteredNewsData, ...filteredShopData, ...filteredBannersData];

        for (let i = 0; i < allData.length; i += 5) {
            rows.push(allData.slice(i, i + 5));
        }

        return rows;
    };

    // Обработчик открытия модального окна
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        const itemRoute = buildItemRoute(item);
        if (itemRoute) {
            navigate(itemRoute, {
                state: { modalBackground: location.pathname || "/" },
            });
        }
    };

    // Обработчик закрытия модального окна
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        const background = location.state?.modalBackground || "/";
        navigate(background, { replace: true });
    };

    // Синхронизация состояния модалки с URL (ЧПУ)
    useEffect(() => {
        const inferredRouteType = routeType || (location.pathname.startsWith('/shopitem/') ? 'shopitem' : '');
        const normalizedRouteType = normalizeEntityType(inferredRouteType);
        const hasRouteModal = Boolean(normalizedRouteType && routeUrlText);

        if (hasRouteModal) {
            if (!isCasesLoaded) return;
            const itemFromUrl = findItemByUrlText(routeUrlText);
            const normalizedItemType = normalizeEntityType(itemFromUrl?.type);
            // Если url_text не найден (невалидный URL) — показываем 404 без silent redirect.
            if (!itemFromUrl || (normalizedRouteType && normalizedItemType !== normalizedRouteType)) {
                return;
            }

            setIsModalOpen(true);
            setSelectedItem(itemFromUrl);
            return;
        }

        // Если мы не на /cases/:type/:url_text — модалка должна быть закрыта
        if (isModalOpen || selectedItem) {
            setIsModalOpen(false);
            setSelectedItem(null);
        }
    }, [routeType, routeUrlText, location.pathname, navigate, isCasesLoaded, casesData, newsData, shopData, bannersData]);

    // Прокрутка к карточке при открытии модалки — до useEffect модалки (overflow), иначе ломается порядок с position:fixed.
    useLayoutEffect(() => {
        if (!selectedItem || !selectedItem.url_text) return;

        const scrollToCard = () => {
            const selector = `[data-url-text="${selectedItem.url_text}"]`;
            const cardElement = document.querySelector(selector);
            if (!cardElement) return false;
            const rect = cardElement.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const offsetTop = rect.top + scrollTop - 120;
            window.scrollTo({ top: offsetTop, left: 0, behavior: "auto" });
            return true;
        };

        if (scrollToCard()) return undefined;
        const id = requestAnimationFrame(() => {
            scrollToCard();
        });
        return () => cancelAnimationFrame(id);
    }, [selectedItem]);

    const rows = createRows();
    const currentCategory = filterCategories[selectedCategory ?? 'all'];
    const availableTags = currentCategory ? currentCategory.tags : [];
    const tagCountSourceData = useMemo(() => {
        let source = [...casesData, ...newsData, ...shopData, ...bannersData];
        if (selectedCategory === 'all' && selectedType !== null) {
            source = source.filter((item) => item.type === selectedType);
        }
        return source;
    }, [casesData, newsData, shopData, bannersData, selectedCategory, selectedType]);
    const availableTagCounts = useMemo(() => {
        const counts = {};
        availableTags.forEach((tag) => {
            counts[tag] = tagCountSourceData.reduce(
                (acc, item) => (item.tags.includes(tag) ? acc + 1 : acc),
                0
            );
        });
        return counts;
    }, [availableTags, tagCountSourceData]);
    const visibleTags = useMemo(
        () => availableTags
            .filter((tag) => (availableTagCounts[tag] ?? 0) > 0)
            .sort((a, b) => (availableTagCounts[b] ?? 0) - (availableTagCounts[a] ?? 0)),
        [availableTags, availableTagCounts]
    );
    const shouldShowLoader = !isCasesLoaded || isLoading;
    const isDetailRoute = /^\/(case|new|banner|shopitem)\//.test(location.pathname);
    const routeDetailItem = isDetailRoute && routeUrlText ? findItemByUrlText(routeUrlText) : null;
    const seoDetailItem = isDetailRoute ? (routeDetailItem || selectedItem) : null;
    const seoTitle = seoDetailItem
        ? withSiteName(`${seoDetailItem.title} — проект`)
        : "";
    const seoDescription = seoDetailItem
        ? truncateText(seoDetailItem.description || seoDetailItem.title, 170)
        : "";
    const seoImageMeta = resolveImageMeta({
        alt: seoDetailItem?.imageAlt,
        caption: seoDetailItem?.imageCaption,
        description: seoDetailItem?.imageDescription,
        title: seoDetailItem?.title,
        fallbackDescription: seoDescription,
    });
    const seoImageObject = buildSchemaImageObject({
        url: seoDetailItem?.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`,
        alt: seoImageMeta.alt,
        caption: seoImageMeta.caption,
        description: seoImageMeta.description,
        title: seoDetailItem?.title,
        fallbackDescription: seoDescription,
    });
    const isInvalidDetailRoute = isDetailRoute && isCasesLoaded && !routeDetailItem;

    const schemaTypeByItem = (item) => {
        if (!item) return "WebPage";
        if (item.type === "new" || item.type === "banner") return "Article";
        if (item.type === "shop") return "Product";
        if (item.type === "case") return "CreativeWork";
        return "WebPage";
    };

    useSeo({
        enabled: isDetailRoute && Boolean(seoDetailItem),
        title: seoTitle,
        description: seoDescription,
        pathname: location.pathname,
        ogType: seoDetailItem?.type === "new" || seoDetailItem?.type === "banner" ? "article" : "website",
        ogImage: seoDetailItem?.imgSrc || "/alazar-logo.png",
        ogImageAlt: seoImageMeta.alt,
        schema: seoDetailItem
            ? {
                "@context": "https://schema.org",
                "@type": schemaTypeByItem(seoDetailItem),
                name: seoDetailItem.title,
                description: seoDescription,
                url: `${SITE_BASE_URL}${location.pathname}`,
                image: seoImageObject || (seoDetailItem.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`),
                publisher: {
                    "@type": "Organization",
                    name: SITE_NAME,
                },
            }
            : null,
        schemaId: "schema-home-detail-page",
    });

    if (isInvalidDetailRoute) {
        return <NotFound />;
    }

    // Функция для рендеринга фильтра
    const renderFilter = (containerClass = classes.filterContainer) => (
        <div className={containerClass}>
            {/* Верхние категории */}
            <div className={classes.filterCategories}>
                {Object.keys(filterCategories).map((key) => (
                    <button
                        key={key}
                        className={`${classes.filterCategory} ${selectedCategory === key ? classes.filterCategory_active : ''}`}
                        onClick={() => handleCategorySelect(key)}
                    >
                        {filterCategories[key].name}
                    </button>
                ))}
            </div>

            {/* Нижние теги */}
            {visibleTags.length > 0 && (
                <div className={classes.filterTags}>
                    {visibleTags.map((tag) => (
                        <button
                            key={tag}
                            className={`${classes.filterTag} ${selectedTag === tag ? classes.filterTag_active : ''}`}
                            onClick={() => handleTagSelect(tag)}
                        >
                            <span>{tag}</span>
                            <span className={classes.filterTagCount}>{availableTagCounts[tag] ?? 0}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <>
        <section className={classes.casesContainer} aria-labelledby="home-cases-section-title">
                <h2 id="home-cases-section-title" className={classes.visuallyHidden}>
                    Подборка кейсов, новостей, предложений магазина и акций
                </h2>
                <div className={classes.cases} ref={casesContainerRef}>
                    <h2 className={classes.sectionHeading}>Кейсы, публикации и продукты студии</h2>
                    {/* Оригинальный фильтр */}
                    <div ref={filterRef} data-filter-container="true">
                        {renderFilter()}
                    </div>

                    {/* Начало кейсов для прокрутки */}
                    <div ref={casesRef}></div>

                    {/* Лоадер */}
                    {shouldShowLoader && (
                        <div className={classes.loaderContainer}>
                            <div className={classes.loader}></div>
                        </div>
                    )}

                    {/* Результаты или сообщение об отсутствии результатов */}
                    {!shouldShowLoader && (
                        <>
                            {rows.length > 0 ? (
                                rows.map((row, rowIndex) => (
                                    <section key={rowIndex} className={classes.casesRow} aria-label={`Ряд карточек ${rowIndex + 1}`}>
                                        {row.map((caseData, index) => (
                                            <CaseCard 
                                                key={`${rowIndex}-${index}`} 
                                                {...caseData} 
                                                teamItems={teamFromApi}
                                                onClick={() => handleItemClick(caseData)}
                                            />
                                        ))}
                                    </section>
                                ))
                            ) : (
                                <div className={classes.noResults}>
                                    <p>Ничего не найдено</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

            {/* Фиксированный фильтр внизу экрана */}
            {/* {!isFilterVisible && ( */}
            <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                {renderFilter(classes.filterContainerFixed)}
            </div>
            {/* )} */}

        </section>

            {/* Модальное окно */}
            {typeof document !== 'undefined'
                ? createPortal(
                    <Modal isOpen={isModalOpen} onClose={handleCloseModal} closeButtonWrapClassName={selectedItem?.type === 'case' ? caseDetailsModalClasses.closeButtonWrapCase : undefined}>
            {selectedItem && (
                (selectedItem.type === 'case')
                    ? <CaseDetailsModal item={selectedItem} teamItems={teamFromApi} cases={casesData} onSelectCase={(c) => setSelectedItem({ ...c, type: 'case' })} />
                    : (selectedItem.type === 'shop')
                        ? <ShopDetailsModal item={selectedItem} teamItems={teamFromApi} />
                    : (selectedItem.type === 'new' || selectedItem.type === 'banner')
                        ? <NewsDetailsModal item={selectedItem} />
                    : (
                        <div style={{ padding: '40px' }}>
                            <h2>{selectedItem.title}</h2>
                            <p>{selectedItem.description}</p>
                        </div>
                    )
            )}
                    </Modal>,
                    document.body
                )
                : null}
        </>
    );
}

export default Cases;
