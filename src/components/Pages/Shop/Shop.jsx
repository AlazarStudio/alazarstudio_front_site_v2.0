import React, { useState, useEffect, useRef, useMemo } from "react";
import classes from './Shop.module.css';
import { filterCategories } from '../../../data/casesData.jsx';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicCasesAPI, publicTeamAPI } from '@/lib/api';
import { isCaseForShop, mapCaseRecordToShopCard } from '../../Blocks/Cases/casesHelpers';
import CaseDetailsModal from '../../Blocks/Cases/CaseDetailsModal';

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
    const [selectedCategory, setSelectedCategory] = useState('all'); // По умолчанию "Все"
    const [selectedTag, setSelectedTag] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isCasesEnded, setIsCasesEnded] = useState(false);
    const [casesFromApi, setCasesFromApi] = useState([]);
    const [teamFromApi, setTeamFromApi] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const filterRef = useRef(null);
    const casesContainerRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();
    const shopData = useMemo(
        () => (Array.isArray(casesFromApi) ? casesFromApi.filter((item) => isCaseForShop(item)).map(mapCaseRecordToShopCard) : []),
        [casesFromApi]
    );

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

        const itemFromUrl = shopData.find((n) => n.url_text === routeUrlText);
        if (!itemFromUrl) {
            setIsModalOpen(false);
            setSelectedItem(null);
            navigate("/shop", { replace: true });
            return;
        }

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

    // Функция для рендеринга фильтра
    const renderFilter = (containerClass = classes.filterContainer) => {
        const currentCategory = filterCategories[selectedCategory];
        const availableTags = currentCategory ? currentCategory.tags : [];

        return (
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
                {/* Заголовок */}
                <div className={classes.blogTitle}>
                    <div className={classes.blogTitle_text}>
                        Магазин

                        <div className={classes.sideLight_right}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                        <div className={classes.sideLight_left}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                    </div>
                </div>

                <div className={classes.blogContent_info} ref={casesContainerRef}>
                    {/* Поиск */}
                    <div className={classes.searchRow}>
                        <input
                            type="text"
                            placeholder="Поиск по магазину..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={classes.searchInput}
                        />
                    </div>

                    {/* Фильтры */}
                    <div ref={filterRef} data-filter-container="true">
                        {renderFilter()}
                    </div>

                    {/* Прелоадер */}
                    {isLoading && (
                        <div className={classes.loaderContainer}>
                            <div className={classes.loader}></div>
                        </div>
                    )}

                    {/* Результаты */}
                    {!isLoading && (
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

                {/* Фиксированный фильтр внизу экрана */}
                <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                    {renderFilter(classes.filterContainerFixed)}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                {selectedItem && (
                    <CaseDetailsModal item={selectedItem} teamItems={teamFromApi} />
                )}
            </Modal>
        </div>
    );
}

export default Shop;
