import React, { useState, useEffect } from "react";
import classes from './Blog.module.css';
import { newsData } from '../../../data/casesData.jsx';
import { IconButton, Tooltip } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";

function Blog({ children, ...props }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' или 'oldest'
    const [isLoading, setIsLoading] = useState(false);
    const [filteredNews, setFilteredNews] = useState(newsData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { url_text: routeUrlText } = useParams();

    // Фильтрация, поиск и сортировка
    useEffect(() => {
        const hasActiveFilters = searchQuery.trim() !== '';

        // Показываем лоадер только если есть активные фильтры
        if (hasActiveFilters) {
            setIsLoading(true);
        }

        let filtered = [...newsData];

        // Поиск по названию и описанию
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                const titleMatch = typeof item.title === 'string'
                    ? item.title.toLowerCase().includes(query)
                    : false;
                const descMatch = item.description.toLowerCase().includes(query);
                return titleMatch || descMatch;
            });
        }

        // Сортировка по дате
        filtered.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest'
                ? dateB - dateA  // Новые первыми
                : dateA - dateB; // Старые первыми
        });

        // Показываем лоадер на 0.5 секунды для плавности, если есть поиск
        if (hasActiveFilters) {
            const timer = setTimeout(() => {
                setFilteredNews(filtered);
                setIsLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // Если нет поиска, сразу показываем все новости без лоадера
            setFilteredNews(filtered);
            setIsLoading(false);
        }
    }, [searchQuery, sortOrder]);

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

    // Синхронизация модалки с URL для блога
    useEffect(() => {
        if (!routeUrlText) {
            if (isModalOpen || selectedItem) {
                setIsModalOpen(false);
                setSelectedItem(null);
            }
            return;
        }

        const itemFromUrl = newsData.find(n => n.url_text === routeUrlText);
        if (!itemFromUrl) {
            setIsModalOpen(false);
            setSelectedItem(null);
            navigate("/blog", { replace: true });
            return;
        }

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeUrlText, navigate]);

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

                <div className={classes.blogContent_info}>

                    {/* Поиск и сортировка */}
                    <div className={classes.searchRow}>
                        {/* Поиск */}
                        <input
                            type="text"
                            placeholder="Поиск по новостям..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={classes.searchInput}
                        />

                        {/* Иконка сортировки */}
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
                                }}
                            >
                                <SortIcon />
                            </IconButton>
                        </Tooltip>
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
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                {selectedItem && (
                    <div style={{ padding: '40px' }}>
                        <h2>{selectedItem.title}</h2>
                        <p>{selectedItem.description}</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Blog;
