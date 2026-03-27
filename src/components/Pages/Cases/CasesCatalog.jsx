import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import classes from '../Shop/Shop.module.css';
import caseFilterClasses from '@/components/Blocks/Cases/Cases.module.css';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicCasesAPI, publicDynamicPageRecordsAPI, publicTeamAPI } from '@/lib/api';
import { extractPlainText, extractTagRelations, isCaseForShop, mapCaseRecordToCard } from '@/components/Blocks/Cases/casesHelpers';
import CaseDetailsModal from '@/components/Blocks/Cases/CaseDetailsModal';
import caseDetailsModalClasses from '@/components/Blocks/Cases/CaseDetailsModal.module.css';
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, resolveImageMeta, SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";
import NotFound from "@/app/NotFound";

const CASES_LIST_PAGE_TITLE = "Кейсы Alazar";
const CASES_LIST_META_DESCRIPTION =
  "Реализованные проекты и примеры цифровых решений студии.";
const CASES_LIST_INTRO =
  "В этом разделе собраны проекты Alazar, отражающие наш подход к разработке, дизайну и созданию комплексных цифровых решений. Каждый кейс — это путь от задачи к результату.";

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

function CasesCatalog({ children, ...props }) {
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
    const [isLoading, setIsLoading] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isCasesEnded, setIsCasesEnded] = useState(false);
    const [casesFromApi, setCasesFromApi] = useState([]);
    const [teamFromApi, setTeamFromApi] = useState([]);
    const [relatedTagLabelsByKey, setRelatedTagLabelsByKey] = useState({});
    const [filteredItems, setFilteredItems] = useState([]);
    const filterRef = useRef(null);
    const casesContainerRef = useRef(null);
    const listStartRef = useRef(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileFilterModalOpen, setIsMobileFilterModalOpen] = useState(false);
    const [draftCategory, setDraftCategory] = useState('all');
    const [draftTag, setDraftTag] = useState(null);
    const autoActionHandledRef = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isCasesLoaded, setIsCasesLoaded] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();
    const resolveRelatedTagLabel = useMemo(
        () => (id, resourceSlug = '') => relatedTagLabelsByKey[`${String(resourceSlug || '').toLowerCase()}:${String(id)}`] || '',
        [relatedTagLabelsByKey]
    );
    const casesData = useMemo(
        () => (
            Array.isArray(casesFromApi)
                ? casesFromApi
                    .filter((item) => !isCaseForShop(item))
                    .map((item) => mapCaseRecordToCard(item, resolveRelatedTagLabel))
                : []
        ),
        [casesFromApi, resolveRelatedTagLabel]
    );
    const shouldShowLoader = !isCasesLoaded || isLoading;
    const seoItem = useMemo(
        () => (routeUrlText ? casesData.find((item) => item.url_text === routeUrlText) || null : null),
        [routeUrlText, casesData]
    );
    const seoItemTitle = extractTextFromJSX(seoItem?.title);
    const seoItemCategory = Array.isArray(seoItem?.tags) && seoItem.tags.length > 0 ? seoItem.tags[0] : "веб-разработке и дизайну";
    const seoTitle = seoItem
        ? withSiteName(`${seoItemTitle} — кейс по ${seoItemCategory}`)
        : CASES_LIST_PAGE_TITLE;
    const seoDescription = seoItem
        ? truncateText(seoItem.description || `${seoItemTitle}. Реализованный проект Alazar Studio.`, 170)
        : CASES_LIST_META_DESCRIPTION;
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
                    "@type": "CreativeWork",
                    "@id": `${SITE_BASE_URL}/cases/${seoItem.url_text}#work`,
                    name: extractTextFromJSX(seoItem.title),
                    description: seoDescription,
                    image: seoImageObject || (seoItem.imgSrc || `${SITE_BASE_URL}/alazar-logo.png`),
                    url: `${SITE_BASE_URL}/cases/${seoItem.url_text}`,
                    creator: {
                        "@type": "Organization",
                        name: SITE_NAME,
                    },
                },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_BASE_URL}/` },
                        { "@type": "ListItem", position: 2, name: CASES_LIST_PAGE_TITLE, item: `${SITE_BASE_URL}/cases` },
                        { "@type": "ListItem", position: 3, name: extractTextFromJSX(seoItem.title), item: `${SITE_BASE_URL}/cases/${seoItem.url_text}` },
                    ],
                },
            ],
        }
        : {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: CASES_LIST_PAGE_TITLE,
            url: `${SITE_BASE_URL}/cases`,
            description: CASES_LIST_META_DESCRIPTION,
        };
    const isInvalidDetailRoute = Boolean(routeUrlText) && isCasesLoaded && !seoItem;

    useSeo({
        title: seoTitle,
        description: seoDescription,
        pathname: routeUrlText ? `/cases/${routeUrlText}` : "/cases",
        ogType: "website",
        ogImage: seoItem?.imgSrc || "/alazar-logo.png",
        ogImageAlt: seoImageMeta.alt,
        schema: seoSchema,
        schemaId: "schema-cases-page",
    });

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [casesResponse, teamResponse] = await Promise.all([
                    publicCasesAPI.getAll({ page: 1, limit: 1000 }),
                    publicTeamAPI.getAll({ page: 1, limit: 500 }),
                ]);
                if (cancelled) return;
                setCasesFromApi(Array.isArray(casesResponse.data?.cases) ? casesResponse.data.cases : []);
                setTeamFromApi(Array.isArray(teamResponse.data?.team) ? teamResponse.data.team : []);
            } catch (error) {
                if (cancelled) return;
                setCasesFromApi([]);
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

    useEffect(() => {
        const hasActiveFilters = selectedTag !== null || searchQuery.trim() !== '';
        if (hasActiveFilters) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
        setIsLoading(false);
    }, [selectedTag, searchQuery]);

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

    useEffect(() => {
        let filtered = [...casesData];

        if (selectedTag !== null) {
            filtered = filtered.filter(item => item.tags.includes(selectedTag));
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const titleText = extractTextFromJSX(item.title).toLowerCase();
                const titleMatch = titleText.includes(query);
                const descMatch = item.description.toLowerCase().includes(query);
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(query));

                return titleMatch || descMatch || tagsMatch;
            });
        }

        setFilteredItems(filtered);
    }, [selectedCategory, selectedTag, searchQuery, casesData]);

    const handleCategorySelect = (category) => {
        if (category === selectedCategory) {
            setSelectedCategory(null);
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

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        if (item?.url_text) {
            navigate(`/cases/${item.url_text}`, {
                state: { modalBackground: "/cases" },
            });
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        const background = location.state?.modalBackground || "/cases";
        navigate(background, { replace: true });
    };

    useEffect(() => {
        if (!routeUrlText) {
            if (isModalOpen || selectedItem) {
                setIsModalOpen(false);
                setSelectedItem(null);
            }
            return;
        }

        if (!isCasesLoaded) return;

        const itemFromUrl = casesData.find((n) => n.url_text === routeUrlText);
        if (!itemFromUrl) return;

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate, casesData]);

    useEffect(() => {
        if (!location.state?.openFirstCaseRequest || autoActionHandledRef.current || !isCasesLoaded) {
            return;
        }

        const firstCase = casesData[0];
        if (!firstCase?.url_text) {
            return;
        }

        autoActionHandledRef.current = true;
        navigate(`/cases/${firstCase.url_text}`, {
            replace: true,
            state: {
                modalBackground: "/cases",
                autoOpenContactModal: true,
            },
        });
    }, [location.state, isCasesLoaded, casesData, navigate]);

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

    const draftCurrentCategory = filterCategories[draftCategory ?? 'all'];
    const draftAvailableTags = draftCurrentCategory ? draftCurrentCategory.tags : [];
    const draftTagCountSourceData = useMemo(() => [...casesData], [casesData]);
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
            acc[tag] = casesData.reduce(
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
        <section className={classes.blogContainer} aria-labelledby="cases-page-title">
            <div className={classes.blogContent}>
                <header
                    className={`${classes.blogTitle} ${!routeUrlText ? classes.blogTitle_withIntro : ""}`}
                >
                    <div className={classes.blogTitle_stack}>
                        <h1 id="cases-page-title" className={classes.blogTitle_text}>
                            {CASES_LIST_PAGE_TITLE}
                        </h1>
                        {!routeUrlText && (
                            <p className={classes.blogTitle_intro}>{CASES_LIST_INTRO}</p>
                        )}
                    </div>
                    <div className={classes.sideLight_right} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                    <div className={classes.sideLight_left} aria-hidden="true">
                        <img src="/sideLight.png" alt="" aria-hidden="true" />
                    </div>
                </header>

                <section className={classes.blogContent_info} ref={casesContainerRef} aria-label="Каталог кейсов">
                    <div className={classes.filterBarRow}>
                        <div className={`${classes.filterBarFilters} ${caseFilterClasses.filterTopDesktop}`} ref={filterRef} data-filter-container="true">
                            {renderFilter({})}
                        </div>
                        <div className={classes.filterBarSearch}>
                            <input
                                type="text"
                                placeholder="Поиск по кейсам..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className={classes.searchInput}
                            />
                        </div>
                    </div>
                    <div ref={listStartRef} />

                    {shouldShowLoader && (
                        <div className={classes.loaderContainer}>
                            <div className={classes.loader}></div>
                        </div>
                    )}

                    {!shouldShowLoader && (
                        <>
                            {filteredItems.length > 0 ? (
                                <div className={classes.newsGrid}>
                                    {filteredItems.map((item, index) => (
                                        <CaseCard
                                            key={index}
                                            {...item}
                                            teamItems={teamFromApi}
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
                    <Modal isOpen={isModalOpen} onClose={handleCloseModal} closeButtonWrapClassName={selectedItem ? caseDetailsModalClasses.closeButtonWrapCase : undefined}>
                {selectedItem && (
                    <CaseDetailsModal
                        item={selectedItem}
                        teamItems={teamFromApi}
                        cases={filteredItems}
                        onSelectCase={(c) => setSelectedItem({ ...c, type: 'case' })}
                        autoOpenContactModal={Boolean(location.state?.autoOpenContactModal)}
                    />
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

export default CasesCatalog;
