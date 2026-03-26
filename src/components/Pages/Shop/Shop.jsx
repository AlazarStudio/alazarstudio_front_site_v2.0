import React, { useState, useEffect, useRef, useMemo } from "react";
import classes from './Shop.module.css';
import { useSiteFilterCategories } from '@/hooks/useSiteFilterCategories';
import CaseCard from "../../Blocks/CaseCard/CaseCard.jsx";
import Modal from "../../Standart/Modal/Modal.jsx";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { publicCasesAPI } from '@/lib/api';
import { isCaseForShop, mapCaseRecordToShopCard } from '@/components/Blocks/Cases/casesHelpers';
import ShopDetailsModal from '@/components/Blocks/Cases/ShopDetailsModal';
import { useSeo } from "@/hooks/useSeo";
import { buildSchemaImageObject, resolveImageMeta, SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";

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
    const { filterCategories } = useSiteFilterCategories();
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
    const seoTitle = seoItem
        ? withSiteName(`${extractTextFromJSX(seoItem.title)} — магазин`)
        : `Магазин | ${SITE_NAME}`;
    const seoDescription = seoItem
        ? truncateText(seoItem.description || extractTextFromJSX(seoItem.title), 170)
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

    useSeo({
        title: seoTitle,
        description: seoDescription,
        pathname: routeUrlText ? `/shop/${routeUrlText}` : "/shop",
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

        if (!isShopLoaded) return;

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
        <section className={classes.blogContainer} aria-labelledby="shop-page-title">
            <div className={classes.blogContent}>
                {/* Заголовок */}
                <header className={classes.blogTitle}>
                    <h1 id="shop-page-title" className={classes.blogTitle_text}>
                        Магазин

                        <div className={classes.sideLight_right}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                        <div className={classes.sideLight_left}>
                            <img src="/sideLight.png" alt="" />
                        </div>
                    </h1>
                </header>

                <section className={classes.blogContent_info} ref={casesContainerRef} aria-label="Лента магазина">
                    <div className={classes.filterBarRow}>
                        <div className={classes.filterBarFilters} ref={filterRef} data-filter-container="true">
                            {renderFilter()}
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
                    {renderFilter(classes.filterContainerFixed)}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                {selectedItem && (
                    <ShopDetailsModal item={selectedItem} />
                )}
            </Modal>
        </section>
    );
}

export default Shop;
