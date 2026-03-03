import React, { useState, useRef, useEffect, useMemo } from "react";
import classes from './Cases.module.css';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { filterCategories, elementTypes } from '../../../data/casesData.jsx';
import Modal from '../../Standart/Modal/Modal.jsx';
import CaseCard from "../CaseCard/CaseCard.jsx";
import CaseDetailsModal from './CaseDetailsModal';
import NewsDetailsModal from './NewsDetailsModal';
import ShopDetailsModal from './ShopDetailsModal';
import { extractPlainText, extractTagRelations, isCaseForShop, mapCaseRecordToCard, mapCaseRecordToShopCard } from '@/components/Blocks/Cases/casesHelpers';
import { isStockActual, mapNewsRecordToCard, mapStockRecordToCard } from '@/components/Blocks/Cases/newsHelpers';
import { publicCasesAPI, publicDynamicPageRecordsAPI, publicNewsAPI, publicStocksAPI, publicTeamAPI } from '@/lib/api';

function Cases({ children, ...props }) {
    // Состояния для фильтрации
    const [selectedCategory, setSelectedCategory] = useState(null); // По умолчанию ничего не выбрано
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
            setSelectedTag(null); // Сбрасываем выбранный тег при смене категории
            // Сбрасываем тип при смене категории (кроме "Все")
            if (category !== 'all') {
                setSelectedType(null);
            }
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

    // Функция для создания строк с учетом требования: 
    // 3 любых (кроме акций), 2 акции, 6 любых, 2 акции и т.д.
    const createRows = () => {
        const rows = [];

        // Фильтруем данные перед созданием строк
        const filteredCasesData = filterData(casesData);
        const filteredNewsData = filterData(newsData);
        const filteredShopData = filterData(shopData);
        const filteredBannersData = filterData(bannersData);

        // Собираем все элементы кроме акций (без перемешивания)
        const otherData = [...filteredCasesData, ...filteredNewsData, ...filteredShopData];

        // Создаем копию массива акций для работы
        const banners = [...filteredBannersData];

        let otherIndex = 0;
        let bannerIndex = 0;
        let isFirstGroup = true;

        while (otherIndex < otherData.length || bannerIndex < banners.length) {
            // Первая группа - 3 элемента, остальные - по 6
            const currentGroupSize = isFirstGroup ? 3 : 6;

            // Создаем строки для группы не-акций
            // Если группа из 6 элементов, разбиваем на 2 строки по 3
            const elementsToAdd = Math.min(currentGroupSize, otherData.length - otherIndex);

            if (elementsToAdd === 3) {
                // Создаем одну строку с 3 элементами
                const otherRow = [];
                for (let i = 0; i < 3 && otherIndex < otherData.length; i++) {
                    otherRow.push(otherData[otherIndex]);
                    otherIndex++;
                }
                if (otherRow.length > 0) {
                    rows.push(otherRow);
                }
            } else if (elementsToAdd === 6) {
                // Создаем 2 строки по 3 элемента
                for (let rowNum = 0; rowNum < 2; rowNum++) {
                    const otherRow = [];
                    for (let i = 0; i < 3 && otherIndex < otherData.length; i++) {
                        otherRow.push(otherData[otherIndex]);
                        otherIndex++;
                    }
                    if (otherRow.length > 0) {
                        rows.push(otherRow);
                    }
                }
            } else {
                // Для остальных случаев (меньше 3 или 6)
                const otherRow = [];
                for (let i = 0; i < elementsToAdd && otherIndex < otherData.length; i++) {
                    otherRow.push(otherData[otherIndex]);
                    otherIndex++;
                }
                if (otherRow.length > 0) {
                    rows.push(otherRow);
                }
            }

            // Создаем строку для 2 акций
            const bannerRow = [];
            if (bannerIndex < banners.length) {
                bannerRow.push(banners[bannerIndex]);
                bannerIndex++;
            }
            if (bannerIndex < banners.length) {
                bannerRow.push(banners[bannerIndex]);
                bannerIndex++;
            }
            if (bannerRow.length > 0) {
                rows.push(bannerRow);
            }

            isFirstGroup = false;
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
            // Если url_text не найден (невалидный URL) — закрываем и возвращаем на главную
            if (!itemFromUrl || (normalizedRouteType && normalizedItemType !== normalizedRouteType)) {
                setIsModalOpen(false);
                setSelectedItem(null);
                navigate("/", { replace: true });
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

    // Прокрутка к карточке при открытии по URL
    useEffect(() => {
        if (!selectedItem || !selectedItem.url_text) return;

        // Ждем, чтобы DOM точно прорендерился
        const timer = setTimeout(() => {
            const selector = `[data-url-text="${selectedItem.url_text}"]`;
            const cardElement = document.querySelector(selector);
            if (cardElement) {
                const rect = cardElement.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const offsetTop = rect.top + scrollTop - 120; // небольшой отступ под хедер

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth',
                });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [selectedItem]);

    const rows = createRows();
    const currentCategory = filterCategories[selectedCategory];
    const availableTags = currentCategory ? currentCategory.tags : [];
    const shouldShowLoader = !isCasesLoaded || isLoading;

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

            {/* Фильтр по типам - показывается только для категории "Все" */}
            {selectedCategory === 'all' && (
                <div className={classes.filterTypes}>
                    {elementTypes.map((type) => (
                        <button
                            key={type.key}
                            className={`${classes.filterType} ${selectedType === type.key ? classes.filterType_active : ''}`}
                            onClick={() => handleTypeSelect(type.key)}
                        >
                            {type.name}
                        </button>
                    ))}
                </div>
            )}

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

    return (
        <div className={classes.casesContainer}>
            <div className={"centerBlock"}>
                <div className={classes.cases} ref={casesContainerRef}>
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
                                    <div key={rowIndex} className={classes.casesRow}>
                                        {row.map((caseData, index) => (
                                            <CaseCard 
                                                key={`${rowIndex}-${index}`} 
                                                {...caseData} 
                                                onClick={() => handleItemClick(caseData)}
                                            />
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div className={classes.noResults}>
                                    <p>Ничего не найдено</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Фиксированный фильтр внизу экрана */}
            {/* {!isFilterVisible && ( */}
            <div className={`${classes.filterFixed} ${isCasesEnded ? classes.animateTopVisible : (isFilterVisible ? classes.animateTopVisible : classes.animateBottomVisible)}`}>
                {renderFilter(classes.filterContainerFixed)}
            </div>
            {/* )} */}

            {/* Модальное окно */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
            {selectedItem && (
                (selectedItem.type === 'case')
                    ? <CaseDetailsModal item={selectedItem} teamItems={teamFromApi} />
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
            </Modal>
        </div>
    );
}

export default Cases;