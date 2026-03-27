import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import classes from './Blog.module.css';
import caseFilterClasses from '@/components/Blocks/Cases/Cases.module.css';
import { IconButton, Tooltip } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicNewsAPI } from '@/lib/api';
import { mapNewsRecordToCard } from '@/components/Blocks/Cases/newsHelpers';
import NewsDetailsModal from '../../Blocks/Cases/NewsDetailsModal';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, resolveImageMeta, SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";
import NotFound from "@/app/NotFound";

function Blog({ children, ...props }) {
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
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTag, setSelectedTag] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' или 'oldest'
    const [isLoading, setIsLoading] = useState(false);
    const [filteredNews, setFilteredNews] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newsFromApi, setNewsFromApi] = useState([]);
    const [isNewsLoaded, setIsNewsLoaded] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isCasesEnded, setIsCasesEnded] = useState(false);
    const filterRef = useRef(null);
    const casesContainerRef = useRef(null);
    const listStartRef = useRef(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
    const [draftCategory, setDraftCategory] = useState('all');
    const [draftTag, setDraftTag] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();
    const newsData = useMemo(
        () => (Array.isArray(newsFromApi) ? newsFromApi.map(mapNewsRecordToCard) : []),
        [newsFromApi]
    );
    const shouldShowLoader = !isNewsLoaded || isLoading;
    const seoItem = useMemo(
        () => (routeUrlText ? newsData.find((item) => item.url_text === routeUrlText) || null : null),
        [routeUrlText, newsData]
    );

    const seoTitle = seoItem
        ? withSiteName(`${seoItem.title} — статья Alazar Studio`)
        : `Блог | ${SITE_NAME}`;
    const seoDescription = seoItem
        ? truncateText(seoItem.description || seoItem.title, 170)
        : "Новости, статьи и материалы Alazar Studio о веб-разработке, дизайне и цифровых проектах.";
    const seoImageMeta = resolveImageMeta({
        alt: seoItem?.imageAlt,
        caption: seoItem?.imageCaption,
        description: seoItem?.imageDescription,
        title: seoItem?.title,
        fallbackDescription: seoDescription,
    });
    const seoImageObject = buildSchemaImageObject({
        url: seoItem?.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`,
        alt: seoImageMeta.alt,
        caption: seoImageMeta.caption,
        description: seoImageMeta.description,
        title: seoItem?.title,
        fallbackDescription: seoDescription,
    });
    const seoSchema = seoItem
        ? {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Article",
                    "@id": `${SITE_BASE_URL}/news/${seoItem.url_text}#article`,
                    headline: seoItem.title,
                    description: seoDescription,
                    image: seoImageObject || (seoItem.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`),
                    mainEntityOfPage: `${SITE_BASE_URL}/news/${seoItem.url_text}`,
                    author: {
                        "@type": "Organization",
                        name: SITE_NAME,
                    },
                    publisher: {
                        "@type": "Organization",
                        name: SITE_NAME,
                        logo: {
                            "@type": "ImageObject",
                            url: `${SITE_BASE_URL}/alazar-logo.png`,
                        },
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_BASE_URL}/` },
                        { "@type": "ListItem", position: 2, name: "Блог", item: `${SITE_BASE_URL}/news` },
                        { "@type": "ListItem", position: 3, name: seoItem.title, item: `${SITE_BASE_URL}/news/${seoItem.url_text}` },
                    ],
                },
            ],
        }
        : {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Блог",
            url: `${SITE_BASE_URL}/news`,
            description: seoDescription,
        };
    const isInvalidDetailRoute = Boolean(routeUrlText) && isNewsLoaded && !seoItem;

    useSeo({
        title: seoTitle,
        description: seoDescription,
        pathname: routeUrlText ? `/news/${routeUrlText}` : "/news",
        robots: "noindex,nofollow",
        ogType: seoItem ? "article" : "website",
        ogImage: seoItem?.imgSrc || "/alazar-logo.png",
        ogImageAlt: seoImageMeta.alt,
        schema: seoSchema,
        schemaId: "schema-blog-page",
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const response = await publicNewsAPI.getAll({ page: 1, limit: 500 });
                if (cancelled) return;
                setNewsFromApi(Array.isArray(response.data?.news) ? response.data.news : []);
            } catch (error) {
                if (cancelled) return;
                setNewsFromApi([]);
            } finally {
                if (!cancelled) setIsNewsLoaded(true);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Отслеживание видимости фильтра и конца списка при скролле
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

    // Фильтрация по тегу, поиск и сортировка
    useEffect(() => {
        const hasActiveFilters = selectedTag !== null || searchQuery.trim() !== '';

        if (hasActiveFilters) setIsLoading(true);

        let filtered = [...newsData];

        if (selectedTag !== null) {
            filtered = filtered.filter(item => Array.isArray(item.tags) && item.tags.includes(selectedTag));
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const titleMatch = typeof item.title === 'string'
                    ? item.title.toLowerCase().includes(query)
                    : false;
                const descMatch = (item.description || '').toLowerCase().includes(query);
                return titleMatch || descMatch;
            });
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        if (hasActiveFilters) {
            const timer = setTimeout(() => {
                setFilteredNews(filtered);
                setIsLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        }
        setFilteredNews(filtered);
        setIsLoading(false);
    }, [selectedTag, searchQuery, sortOrder, newsData]);

    useEffect(() => {
        if (!routeUrlText) {
            if (isModalOpen || selectedItem) {
                setIsModalOpen(false);
                setSelectedItem(null);
            }
            return;
        }

        if (!isNewsLoaded) return;

        const itemFromUrl = newsData.find(n => n.url_text === routeUrlText);
        if (!itemFromUrl) return;

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate, newsData, isNewsLoaded]);

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

    // Обработчик изменения поиска
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        if (item?.url_text) {
            navigate(`/news/${item.url_text}`, {
                state: { modalBackground: "/news" },
            });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        const background = location.state?.modalBackground || "/news";
        navigate(background, { replace: true });
    };

    // Обработчик переключения сортировки
    const handleSortToggle = () => {
        setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
    };

    const handleCategorySelect = (category) => {
        if (category === selectedCategory) {
            setSelectedCategory('all');
            setSelectedTag(null);
        } else {
            setSelectedCategory(category);
            setSelectedTag(null);
        }
    };

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
        const cat = selectedCategory === 'all' ? mobileDefaultCategoryKey : selectedCategory;
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

    const draftCurrentCategory = filterCategories[draftCategory ?? 'all'];
    const draftAvailableTags = draftCurrentCategory ? draftCurrentCategory.tags : [];
    const draftTagCountSourceData = useMemo(() => [...newsData], [newsData]);
    const draftAvailableTagCounts = useMemo(() => {
        const counts = {};
        draftAvailableTags.forEach((tag) => {
            counts[tag] = draftTagCountSourceData.reduce(
                (acc, item) => (Array.isArray(item.tags) && item.tags.includes(tag) ? acc + 1 : acc),
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
    const hasAppliedMobileFilter = selectedTag !== null
        || (selectedCategory !== 'all' && selectedCategory !== mobileDefaultCategoryKey);

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
            acc[tag] = newsData.reduce(
                (sum, item) => (Array.isArray(item.tags) && item.tags.includes(tag) ? sum + 1 : sum),
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
        <section className={classes.blogContainer} aria-labelledby="blog-page-title">
            <div className={classes.blogContent}>
                {/* Заголовок */}
                <header className={classes.blogTitle}>
                    <h1 id="blog-page-title" className={classes.blogTitle_text}>
                        Блог
                    </h1>
                    <div className={classes.sideLight_right} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                    <div className={classes.sideLight_left} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                </header>

                <section className={classes.blogContent_info} ref={casesContainerRef} aria-label="Лента новостей">
                    <div className={classes.filterBarRow}>
                        <div className={`${classes.filterBarFilters} ${caseFilterClasses.filterTopDesktop}`} ref={filterRef} data-filter-container="true">
                            {renderFilter({})}
                        </div>
                        <div className={classes.filterBarSearch}>
                            <input
                                type="text"
                                placeholder="Поиск по новостям..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className={classes.searchInput}
                            />
                            <Tooltip
                                title={sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}
                                arrow
                            >
                                <IconButton
                                    onClick={handleSortToggle}
                                    className={classes.sortIconButton}
                                    sx={{
                                        color: '#FFFFFF',
                                        border: '1px solid rgba(255, 255, 255, 0.5)',
                                        borderRadius: '27px',
                                        padding: '12px',
                                        '&:hover': {
                                            backgroundColor: '#FFFFFF',
                                            color: '#000000',
                                            borderColor: '#FFFFFF',
                                        },
                                        '& .MuiSvgIcon-root': {
                                            transform: sortOrder === 'oldest' ? 'scaleY(-1)' : 'scaleY(1)',
                                            transition: 'transform 0.2s ease',
                                        },
                                    }}
                                >
                                    <SortIcon />
                                </IconButton>
                            </Tooltip>
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
                            {filteredNews.length > 0 ? (
                                <div className={classes.newsGrid}>
                                    {filteredNews.map((item, index) => (
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
                            <NewsDetailsModal item={selectedItem} />
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

export default Blog;
