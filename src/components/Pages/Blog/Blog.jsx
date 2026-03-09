import React, { useState, useEffect, useRef } from "react";
import classes from './Blog.module.css';
import { IconButton, Tooltip } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicNewsAPI } from '@/lib/api';
import { mapNewsRecordToCard } from '@/components/Blocks/Cases/newsHelpers';
import NewsDetailsModal from '../../Blocks/Cases/NewsDetailsModal';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';

function Blog({ children, ...props }) {
    const { filterCategories } = useSiteFilterCategories();
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
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();
    const newsData = Array.isArray(newsFromApi) ? newsFromApi.map(mapNewsRecordToCard) : [];
    const shouldShowLoader = !isNewsLoaded || isLoading;

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

    // Синхронизация модалки с URL для блога
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
        if (!itemFromUrl) {
            setIsModalOpen(false);
            setSelectedItem(null);
            navigate("/news", { replace: true });
            return;
        }

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate, newsData, isNewsLoaded]);

    // Скролл к карточке новости при открытии по URL
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

    return (
        <div className={classes.blogContainer}>
            <div className={classes.blogContent}>
                {/* Заголовок */}
                <div className={classes.blogTitle}>
                    <div className={classes.blogTitle_text}>
                        Блог

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
                </div>

                {/* Фиксированный фильтр внизу экрана */}
                <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                    {renderFilter(classes.filterContainerFixed)}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                {selectedItem && (
                    <NewsDetailsModal item={selectedItem} />
                )}
            </Modal>
        </div>
    );
}

export default Blog;
