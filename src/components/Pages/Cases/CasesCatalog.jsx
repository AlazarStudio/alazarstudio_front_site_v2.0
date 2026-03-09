import React, { useState, useEffect, useRef, useMemo } from "react";
import classes from '../Shop/Shop.module.css';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicCasesAPI, publicDynamicPageRecordsAPI, publicTeamAPI } from '@/lib/api';
import { extractPlainText, extractTagRelations, isCaseForShop, mapCaseRecordToCard } from '@/components/Blocks/Cases/casesHelpers';
import CaseDetailsModal from '@/components/Blocks/Cases/CaseDetailsModal';
import caseDetailsModalClasses from '@/components/Blocks/Cases/CaseDetailsModal.module.css';

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
    const { filterCategories } = useSiteFilterCategories();
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
        if (!itemFromUrl) {
            setIsModalOpen(false);
            setSelectedItem(null);
            navigate("/cases", { replace: true });
            return;
        }

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate, casesData]);

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

    const renderFilter = (containerClass = classes.filterContainer) => {
        const currentCategory = filterCategories[selectedCategory];
        const availableTags = currentCategory ? currentCategory.tags : [];

        return (
            <div className={containerClass}>
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

                {availableTags.length > 0 && (
                    <div className={classes.filterTags}>
                        {availableTags.map((tag) => (
                            <button
                                key={tag}
                                className={`${classes.filterTag} ${selectedTag === tag ? classes.filterTag_active : ''}`}
                                onClick={() => handleTagSelect(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={classes.blogContainer}>
            <div className={classes.blogContent}>
                <div className={classes.blogTitle}>
                    <div className={classes.blogTitle_text}>
                        Кейсы

                        <div className={classes.sideLight_right}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                        <div className={classes.sideLight_left}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                    </div>
                </div>

                <div className={classes.blogContent_info} ref={casesContainerRef}>
                    <div className={classes.filterBarRow}>
                        <div className={classes.filterBarFilters} ref={filterRef} data-filter-container="true">
                            {renderFilter()}
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
                </div>

                <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                    {renderFilter(classes.filterContainerFixed)}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} closeButtonWrapClassName={selectedItem ? caseDetailsModalClasses.closeButtonWrapCase : undefined}>
                {selectedItem && (
                    <CaseDetailsModal item={selectedItem} teamItems={teamFromApi} cases={filteredItems} onSelectCase={(c) => setSelectedItem({ ...c, type: 'case' })} />
                )}
            </Modal>
        </div>
    );
}

export default CasesCatalog;
