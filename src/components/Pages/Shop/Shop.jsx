import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import classes from './Shop.module.css';
import caseFilterClasses from '@/components/Blocks/Cases/Cases.module.css';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicCasesAPI } from '@/lib/api';
import { isCaseForShop, mapCaseRecordToShopCard } from '@/components/Blocks/Cases/casesHelpers';
import ShopDetailsModal from '@/components/Blocks/Cases/ShopDetailsModal';
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, resolveImageMeta, SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";
import NotFound from "@/app/NotFound";

// Функция для извлечения текста из JSX элемента
function extractTextFromJSX(element) {
    if (typeof element === 'string') {
        return element;
    }
    if (typeof element === 'number') {
        return String(element);
    }
    if (!element) {
        return '';
    }
    if (Array.isArray(element)) {
        return element.map(extractTextFromJSX).join(' ');
    }
    if (React.isValidElement(element)) {
        if (element.props.children) {
            return extractTextFromJSX(element.props.children);
        }
        return '';
    }
    return '';
}

function Shop({ children, ...props }) {
    const MOBILE_BREAKPOINT = 1024;
    const { filterCategories } = useSiteFilterCategories();
    const mobileDefaultCategoryKey = useMemo(() => {
        const entries = Object.entries(filterCategories || {});
        if (entries.length === 0) return 'all';
        const sphereEntry = entries.find(([key, value]) => {
            if (key === 'all') return false;
            const name = String(value?.name || '').toLowerCase();
            return name.includes('сфер');
        });
        if (sphereEntry) return sphereEntry[0];
        const firstNonAll = entries.find(([key]) => key !== 'all');
        return firstNonAll ? firstNonAll[0] : 'all';
    }, [filterCategories]);
    const [selectedCategory, setSelectedCategory] = useState('all'); // По умолчанию "Все"
    const [selectedTag, setSelectedTag] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isCasesEnded, setIsCasesEnded] = useState(false);
    const [casesFromApi, setCasesFromApi] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const filterRef = useRef(null);
    const casesContainerRef = useRef(null);
    const listStartRef = useRef(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
    const [draftCategory, setDraftCategory] = useState('all');
    const [draftTag, setDraftTag] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isShopLoaded, setIsShopLoaded] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();
    const shopData = useMemo(
        () => (Array.isArray(casesFromApi) ? casesFromApi.filter((item) => isCaseForShop(item)).map(mapCaseRecordToShopCard) : []),
        [casesFromApi]
    );
    const shouldShowLoader = !isShopLoaded || isLoading;
    const seoItem = useMemo(
        () => (routeUrlText ? shopData.find((item) => item.url_text === routeUrlText) || null : null),
        [routeUrlText, shopData]
    );
    const seoItemTitle = extractTextFromJSX(seoItem?.title);
    const seoTitle = seoItem
        ? withSiteName(`${seoItemTitle} — цена и описание`)
        : `Магазин | ${SITE_NAME}`;
    const seoDescription = seoItem
        ? truncateText(seoItem.description || `${seoItemTitle}. Актуальная карточка товара и услуги Alazar Studio.`, 170)
        : "Магазин Alazar Studio: цифровые продукты, услуги и готовые решения для вашего проекта.";
    const seoImageMeta = resolveImageMeta({
        alt: seoItem?.imageAlt,
        caption: seoItem?.imageCaption,
        description: seoItem?.imageDescription,
        title: extractTextFromJSX(seoItem?.title),
        fallbackDescription: seoDescription,
    });
    const seoImageObject = buildSchemaImageObject({
        url: seoItem?.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`,
        alt: seoImageMeta.alt,
        caption: seoImageMeta.caption,
        description: seoImageMeta.description,
        title: extractTextFromJSX(seoItem?.title),
        fallbackDescription: seoDescription,
    });
    const seoSchema = seoItem
        ? {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Product",
                    "@id": `${SITE_BASE_URL}/shop/${seoItem.url_text}#product`,
                    name: extractTextFromJSX(seoItem.title),
                    description: seoDescription,
                    image: seoImageObject || (seoItem.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`),
                    url: `${SITE_BASE_URL}/shop/${seoItem.url_text}`,
                    brand: {
                        "@type": "Brand",
                        name: SITE_NAME,
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_BASE_URL}/` },
                        { "@type": "ListItem", position: 2, name: "Магазин", item: `${SITE_BASE_URL}/shop` },
                        { "@type": "ListItem", position: 3, name: extractTextFromJSX(seoItem.title), item: `${SITE_BASE_URL}/shop/${seoItem.url_text}` },
                    ],
                },
            ],
        }
        : {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Магазин",
            url: `${SITE_BASE_URL}/shop`,
            description: seoDescription,
        };
    const isInvalidDetailRoute = Boolean(routeUrlText) && isShopLoaded && !seoItem;

    useSeo({
        title: seoTitle,
        description: seoDescription,
        pathname: routeUrlText ? `/shop/${routeUrlText}` : "/shop",
        robots: "noindex,nofollow",
        ogType: "website",
        ogImage: seoItem?.imgSrc || "/alazar-logo.png",
        ogImageAlt: seoImageMeta.alt,
        schema: seoSchema,
        schemaId: "schema-shop-page",
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const casesResponse = await publicCasesAPI.getAll({ page: 1, limit: 1000 });
                if (cancelled) return;
                setCasesFromApi(Array.isArray(casesResponse.data?.cases) ? casesResponse.data.cases : []);
            } catch (error) {
                if (cancelled) return;
                setCasesFromApi([]);
            } finally {
                if (!cancelled) setIsShopLoaded(true);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Получаем все уникальные теги из shopData
    const allTags = [...new Set(shopData.flatMap(item => item.tags || []))];

    // Отслеживание видимости фильтра и конца кейсов при скролле
    useEffect(() => {
        const handleScroll = () => {
            if (filterRef.current) {
                const rect = filterRef.current.getBoundingClientRect();
                setIsFilterVisible(rect.bottom > 0);
            }

            if (casesContainerRef.current) {
                const containerRect = casesContainerRef.current.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const threshold = windowHeight * 0.8;
                setIsCasesEnded(containerRect.bottom <= threshold);
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const handleViewportChange = (event) => {
            setIsMobileViewport(event.matches);
            if (!event.matches) {
                setIsMobileFilterModalOpen(false);
            }
        };

        handleViewportChange(mediaQuery);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleViewportChange);
            return () => mediaQuery.removeEventListener('change', handleViewportChange);
        }

        mediaQuery.addListener(handleViewportChange);
        return () => mediaQuery.removeListener(handleViewportChange);
    }, []);

    // Показ лоадера при изменении фильтров
    useEffect(() => {
        const hasActiveFilters = selectedTag !== null || searchQuery.trim() !== '';
        
        if (hasActiveFilters) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Если нет фильтров, сразу скрываем лоадер
            setIsLoading(false);
        }
    }, [selectedTag, searchQuery]);

    // Прокрутка к началу фильтров при выборе тега
    useEffect(() => {
        if (selectedTag !== null && filterRef.current) {
            const filterElement = filterRef.current;
            const elementPosition = filterElement.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 100;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }, [selectedTag]);

    // Фильтрация, поиск и сортировка
    useEffect(() => {
        let filtered = [...shopData];

        // Фильтр по тегу
        if (selectedTag !== null) {
            filtered = filtered.filter(item => item.tags.includes(selectedTag));
        }

        // Поиск по всем полям
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                // Поиск по title (с учетом JSX)
                const titleText = extractTextFromJSX(item.title).toLowerCase();
                const titleMatch = titleText.includes(query);

                // Поиск по description
                const descMatch = item.description.toLowerCase().includes(query);

                // Поиск по тегам
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(query));

                // Поиск по цене
                const priceMatch = String(item.price).includes(query);

                return titleMatch || descMatch || tagsMatch || priceMatch;
            });
        }

        setFilteredItems(filtered);
    }, [selectedCategory, selectedTag, searchQuery, shopData]);

    // Обработчик выбора категории
    const handleCategorySelect = (category) => {
        if (category === selectedCategory) {
            // Если нажимаем на уже выбранную категорию, сбрасываем выбор
            setSelectedCategory(null);
            setSelectedTag(null);
        } else {
            setSelectedCategory(category);
            setSelectedTag(null);
        }
    };

    // Обработчик выбора тега
    const handleTagSelect = (tag) => {
        setSelectedTag(prev => prev === tag ? null : tag);
    };

    const handleDraftCategorySelect = (category) => {
        if (category === draftCategory) {
            setDraftCategory(null);
            setDraftTag(null);
            return;
        }
        setDraftCategory(category);
        setDraftTag(null);
    };

    const handleDraftTagSelect = (tag) => {
        setDraftTag((prev) => (prev === tag ? null : tag));
    };

    const handleOpenMobileFilterModal = () => {
        const cat = selectedCategory === 'all' || selectedCategory == null
            ? mobileDefaultCategoryKey
            : selectedCategory;
        setDraftCategory(cat);
        setDraftTag(selectedTag);
        setIsMobileFilterModalOpen(true);
    };

    const handleCloseMobileFilterModal = () => {
        setIsMobileFilterModalOpen(false);
    };

    const scrollToListStart = () => {
        if (typeof window !== 'undefined' && listStartRef.current) {
            const elementPosition = listStartRef.current.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 100;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    const applyMobileFilterSelection = (nextCategory, nextTag) => {
        setSelectedCategory(nextCategory);
        setSelectedTag(nextTag);
        setIsMobileFilterModalOpen(false);
        scrollToListStart();
    };

    const handleApplyMobileFilter = () => {
        applyMobileFilterSelection(draftCategory, draftTag);
    };

    const handleResetMobileFilter = () => {
        const defaultCategory = mobileDefaultCategoryKey;
        setDraftCategory(defaultCategory);
        setDraftTag(null);
        applyMobileFilterSelection(defaultCategory, null);
    };

    // Обработчик изменения поиска
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        if (item?.url_text) {
            navigate(`/shop/${item.url_text}`, {
                state: { modalBackground: "/shop" },
            });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        const background = location.state?.modalBackground || "/shop";
        navigate(background, { replace: true });
    };

    // Синхронизация модалки с URL для магазина
    useEffect(() => {
        if (!routeUrlText) {
            if (isModalOpen || selectedItem) {
                setIsModalOpen(false);
                setSelectedItem(null);
            }
            return;
        }

        if (!isShopLoaded) return;

        const itemFromUrl = shopData.find((n) => n.url_text === routeUrlText);
        if (!itemFromUrl) return;

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate, shopData]);

    // Скролл к карточке товара при открытии по URL
    useEffect(() => {
        if (!selectedItem || !selectedItem.url_text) return;

        const timer = setTimeout(() => {
            const selector = `[data-url-text="${selectedItem.url_text}"]`;
            const cardElement = document.querySelector(selector);
            if (cardElement) {
                const rect = cardElement.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const offsetTop = rect.top + scrollTop - 120;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth',
                });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [selectedItem]);

    const draftCurrentCategory = filterCategories[draftCategory ?? 'all'];
    const draftAvailableTags = draftCurrentCategory ? draftCurrentCategory.tags : [];
    const draftTagCountSourceData = useMemo(() => [...shopData], [shopData]);
    const draftAvailableTagCounts = useMemo(() => {
        const counts = {};
        draftAvailableTags.forEach((tag) => {
            counts[tag] = draftTagCountSourceData.reduce(
                (acc, item) => (item.tags.includes(tag) ? acc + 1 : acc),
                0
            );
        });
        return counts;
    }, [draftAvailableTags, draftTagCountSourceData]);
    const draftVisibleTags = useMemo(
        () => draftAvailableTags
            .filter((tag) => (draftAvailableTagCounts[tag] ?? 0) > 0)
            .sort((a, b) => (draftAvailableTagCounts[b] ?? 0) - (draftAvailableTagCounts[a] ?? 0)),
        [draftAvailableTags, draftAvailableTagCounts]
    );
    const hasAppliedMobileFilter = selectedTag !== null || (selectedCategory !== null && selectedCategory !== mobileDefaultCategoryKey);

    const handleQuickResetMobileFilter = () => {
        if (!hasAppliedMobileFilter) return;
        const defaultCategory = mobileDefaultCategoryKey;
        setDraftCategory(defaultCategory);
        setDraftTag(null);
        applyMobileFilterSelection(defaultCategory, null);
    };

    const renderFilter = ({
        containerClass = classes.filterContainer,
        activeCategory = selectedCategory,
        activeTags = null,
        activeTagCounts = null,
        activeTag = selectedTag,
        excludeCategoryKeys = [],
        onSelectCategory = handleCategorySelect,
        onSelectTag = handleTagSelect,
        styleModule = classes,
    } = {}) => {
        const currentCategory = filterCategories[activeCategory ?? 'all'];
        const availableTags = currentCategory ? currentCategory.tags : [];
        const computedCounts = availableTags.reduce((acc, tag) => {
            acc[tag] = shopData.reduce(
                (sum, item) => (item.tags.includes(tag) ? sum + 1 : sum),
                0
            );
            return acc;
        }, {});
        const tagCounts = activeTagCounts ?? computedCounts;
        const visibleTags = activeTags ?? availableTags
            .filter((tag) => (tagCounts[tag] ?? 0) > 0)
            .sort((a, b) => (tagCounts[b] ?? 0) - (tagCounts[a] ?? 0));
        const fc = styleModule;

        return (
            <div className={containerClass}>
                <div className={fc.filterCategories}>
                    {Object.keys(filterCategories)
                        .filter((key) => !excludeCategoryKeys.includes(key))
                        .map((key) => (
                            <button
                                key={key}
                                type="button"
                                className={`${fc.filterCategory} ${activeCategory === key ? fc.filterCategory_active : ''}`}
                                onClick={() => onSelectCategory(key)}
                            >
                                {filterCategories[key].name}
                            </button>
                        ))}
                </div>

                {visibleTags.length > 0 && (
                    <div className={fc.filterTags}>
                        {visibleTags.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                className={`${fc.filterTag} ${activeTag === tag ? fc.filterTag_active : ''}`}
                                onClick={() => onSelectTag(tag)}
                            >
                                <span>{tag}</span>
                                <span className={fc.filterTagCount}>{tagCounts[tag] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return isInvalidDetailRoute ? (
        <NotFound />
    ) : (
        <>
        <section className={classes.blogContainer} aria-labelledby="shop-page-title">
            <div className={classes.blogContent}>
                {/* Заголовок */}
                <header className={classes.blogTitle}>
                    <h1 id="shop-page-title" className={classes.blogTitle_text}>
                        Магазин
                    </h1>
                    <div className={classes.sideLight_right} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                    <div className={classes.sideLight_left} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                </header>

                <section className={classes.blogContent_info} ref={casesContainerRef} aria-label="Лента магазина">
                    <div className={classes.filterBarRow}>
                        <div className={`${classes.filterBarFilters} ${caseFilterClasses.filterTopDesktop}`} ref={filterRef} data-filter-container="true">
                            {renderFilter({})}
                        </div>
                        <div className={classes.filterBarSearch}>
                            <input
                                type="text"
                                placeholder="Поиск по магазину..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className={classes.searchInput}
                            />
                        </div>
                    </div>
                    <div ref={listStartRef} />

                    {/* Прелоадер */}
                    {shouldShowLoader && (
                        <div className={classes.loaderContainer}>
                            <div className={classes.loader}></div>
                        </div>
                    )}

                    {/* Результаты */}
                    {!shouldShowLoader && (
                        <>
                            {filteredItems.length > 0 ? (
                                <div className={classes.newsGrid}>
                                    {filteredItems.map((item, index) => (
                                        <CaseCard
                                            key={index}
                                            {...item}
                                            onClick={() => handleItemClick(item)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={classes.noResults}>
                                    <p>Ничего не найдено</p>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Фиксированный фильтр внизу экрана */}
                <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                    {renderFilter({ containerClass: classes.filterContainerFixed })}
                </div>

                {isMobileViewport && (
                    <div className={caseFilterClasses.mobileFilterControls}>
                        <button
                            type="button"
                            className={`${caseFilterClasses.mobileFilterButton} ${hasAppliedMobileFilter ? caseFilterClasses.mobileFilterButtonActive : ''}`}
                            onClick={handleOpenMobileFilterModal}
                            aria-label="Открыть фильтры"
                        >
                            <svg
                                className={caseFilterClasses.mobileFilterButtonIcon}
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M10 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                        {hasAppliedMobileFilter && (
                            <button
                                type="button"
                                className={caseFilterClasses.mobileFilterQuickResetButton}
                                onClick={handleQuickResetMobileFilter}
                                aria-label="Сбросить фильтр"
                            >
                                <svg
                                    className={caseFilterClasses.mobileFilterQuickResetIcon}
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                >
                                    <path d="M20 12C20 16.4183 16.4183 20 12 20C8.77508 20 5.99574 18.0922 4.73244 15.3458" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M4 12C4 7.58172 7.58172 4 12 4C15.2249 4 18.0043 5.90782 19.2676 8.65422" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M4.6 16.8L4.6 14.2L7.2 14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M19.4 7.2L19.4 9.8L16.8 9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>

            {typeof document !== 'undefined'
                ? createPortal(
                    <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                        {selectedItem && (
                            <ShopDetailsModal item={selectedItem} />
                        )}
                    </Modal>,
                    document.body
                )
                : null}

            {typeof document !== 'undefined'
                ? createPortal(
                    <Modal
                        isOpen={isMobileFilterModalOpen}
                        onClose={handleCloseMobileFilterModal}
                        compact
                        contentClassName={caseFilterClasses.mobileFilterModalShell}
                        bodyClassName={caseFilterClasses.mobileFilterModalBody}
                        closeButtonWrapClassName={caseFilterClasses.mobileFilterModalCloseWrap}
                    >
                        <div className={caseFilterClasses.mobileFilterModalContent}>
                            <h3 className={caseFilterClasses.mobileFilterModalTitle}>Фильтры</h3>
                            {renderFilter({
                                containerClass: caseFilterClasses.filterContainerMobileModal,
                                activeCategory: draftCategory,
                                activeTags: draftVisibleTags,
                                activeTagCounts: draftAvailableTagCounts,
                                activeTag: draftTag,
                                excludeCategoryKeys: ['all'],
                                onSelectCategory: handleDraftCategorySelect,
                                onSelectTag: handleDraftTagSelect,
                                styleModule: caseFilterClasses,
                            })}
                            <div className={caseFilterClasses.mobileFilterActions}>
                                <button
                                    type="button"
                                    className={caseFilterClasses.mobileFilterResetButton}
                                    onClick={handleResetMobileFilter}
                                >
                                    Сбросить
                                </button>
                                <button
                                    type="button"
                                    className={caseFilterClasses.mobileFilterApplyButton}
                                    onClick={handleApplyMobileFilter}
                                >
                                    Применить
                                </button>
                            </div>
                        </div>
                    </Modal>,
                    document.body
                )
                : null}
        </>
    );
}

export default Shop;
