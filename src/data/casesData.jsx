import React from "react";

// Функция транслитерации для создания URL-friendly текста
const transliterate = (text) => {
    if (!text) return '';
    
    // Если это JSX элемент, извлекаем текстовое содержимое
    let textStr = '';
    if (typeof text === 'string') {
        textStr = text;
    } else if (React.isValidElement(text)) {
        // Рекурсивно извлекаем текст из JSX
        const extractText = (node) => {
            if (typeof node === 'string') return node;
            if (typeof node === 'number') return String(node);
            if (Array.isArray(node)) {
                return node.map(extractText).join(' ');
            }
            if (node && node.props && node.props.children) {
                return extractText(node.props.children);
            }
            return '';
        };
        textStr = extractText(text);
    } else {
        textStr = String(text);
    }

    // Таблица транслитерации
    const translitMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    // Транслитерация
    let result = textStr
        .split('')
        .map(char => translitMap[char] || char)
        .join('')
        .toLowerCase()
        // Заменяем все не-буквенно-цифровые символы на дефисы
        .replace(/[^a-z0-9]+/g, '-')
        // Убираем дефисы в начале и конце
        .replace(/^-+|-+$/g, '')
        // Убираем множественные дефисы
        .replace(/-+/g, '-');

    return result;
};

// Структура фильтров с тегами из данных
export const filterCategories = {
    all: {
        name: 'Все',
        tags: [] // Для категории "Все" теги не показываются
    },
    byField: {
        name: 'По сферам деятельности',
        tags: [
            'Ритейл', 'Недвижимость', 'Гостиницы и отели', 'Продукты и товары', 'Кафе и рестораны', 'Сервис',
            'Производство', 'Товары для детей', 'Косметка и красота', 'Спорт и здоровье', 'Мероприятия и развлечения'
        ]
    },
    byType: {
        name: 'По виду работ',
        tags: [
            'Веб-дизайн', 'frontend', '2024'
        ]
    }
};

// Типы элементов для фильтрации
export const elementTypes = [
    { key: 'case', name: 'Кейсы' },
    { key: 'banner', name: 'Акции' },
    { key: 'new', name: 'Новости' },
    { key: 'shop', name: 'Магазин' }
];

// Данные кейсов
const casesDataRaw = [
    {
        id: "case-1",
        imgSrc: "/case-img-1.png",
        title: <>Магазин-каталог <br /> DR. PHONE</>,
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн. Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-2",
        imgSrc: "/case-img-2.png",
        title: <>Магазин-каталог <br /> ВЕЛО МОТО DRIVE</>,
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-3",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии1",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-4",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии2",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн1",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-5",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии3",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-6",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии4",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн1",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-7",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии5",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн1",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
    {
        id: "case-8",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии6",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн1",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'case'
    },
];

// Данные баннеров (акций)
const bannersDataRaw = [
    {
        id: "banner-1",
        imgSrc: "/banner-img-1.png",
        title: "Какая то акция1",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
    {
        id: "banner-2",
        imgSrc: "/banner-img-2.png",
        title: "Какая то акция2",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
    {
        id: "banner-3",
        imgSrc: "/banner-img-2.png",
        title: "Какая то акция3",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
    {
        id: "banner-4",
        imgSrc: "/banner-img-2.png",
        title: "Какая то акция4",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
    {
        id: "banner-5",
        imgSrc: "/banner-img-2.png",
        title: "Какая то акция5",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
    {
        id: "banner-6",
        imgSrc: "/banner-img-2.png",
        title: "Какая то акция6",
        description: <>Здесь описание. <br /> Сами карточки черные, подсвечиваются при наведении курсора</>,
        tags: ["Акция"],
        type: 'banner',
        date: '2026-01-12'
    },
];

// Данные новостей
const newsDataRaw = [
    {
        id: "new-1",
        imgSrc: "/new-img-1.png",
        title: "Какие то новости1",
        description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi",
        tags: ["Новости"],
        type: 'new',
        date: '2026-01-11'
    },
    {
        id: "new-2",
        imgSrc: "/new-img-1.png",
        title: "Какие то новости2",
        description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi",
        tags: ["Новости"],
        type: 'new',
        date: '2026-01-12'
    },
    {
        id: "new-3",
        imgSrc: "/new-img-1.png",
        title: "Какие то новости3",
        description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi",
        tags: ["Новости"],
        type: 'new',
        date: '2026-01-13'
    },
    {
        id: "new-4",
        imgSrc: "/new-img-1.png",
        title: "Какие то новости4",
        description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi",
        tags: ["Новости"],
        type: 'new',
        date: '2026-01-14'
    },
    {
        id: "new-5",
        imgSrc: "/new-img-1.png",
        title: "Какие то новости5",
        description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi",
        tags: ["Новости"],
        type: 'new',
        date: '2026-01-15'
    },
];

// Данные магазина
const shopDataRaw = [
    {
        id: "shop-1",
        imgSrc: "/case-img-1.png",
        title: <>Магазин-каталог <br /> DR. PHONE</>,
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'shop',
        price: '50000'
    },
    {
        id: "shop-2",
        imgSrc: "/case-img-2.png",
        title: <>Магазин-каталог <br /> ВЕЛО МОТО DRIVE</>,
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'shop',
        price: '50000'
    },
    {
        id: "shop-3",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии123",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'shop',
        price: '50000'
    },
    {
        id: "shop-4",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии223",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'shop',
        price: '50000'
    },
    {
        id: "shop-5",
        imgSrc: "/case-img-3.png",
        title: "Сайт адвокатской коллегии323",
        description: "Продумали внутреннюю логику для масштабного проекта, разработали систему и обновили дизайн",
        tags: ["Веб-дизайн", "frontend", "2024"],
        type: 'shop',
        price: '50000'
    },
];

// Генерация уникальных url_text для всех элементов (учитывая дубли названий и типы)
const allItemsRaw = [
    ...casesDataRaw,
    ...bannersDataRaw,
    ...newsDataRaw,
    ...shopDataRaw,
];

const urlTextById = (() => {
    const baseCountMap = {};
    const result = {};

    allItemsRaw.forEach((item) => {
        const base = transliterate(item.title) || 'item';
        const key = base || 'item';

        const nextCount = (baseCountMap[key] || 0) + 1;
        baseCountMap[key] = nextCount;

        const finalSlug = nextCount === 1 ? key : `${key}-${nextCount}`;
        result[item.id] = finalSlug;
    });

    return result;
})();

export const casesData = casesDataRaw.map(item => ({
    ...item,
    url_text: urlTextById[item.id],
}));

export const bannersData = bannersDataRaw.map(item => ({
    ...item,
    url_text: urlTextById[item.id],
}));

export const newsData = newsDataRaw.map(item => ({
    ...item,
    url_text: urlTextById[item.id],
}));

export const shopData = shopDataRaw.map(item => ({
    ...item,
    url_text: urlTextById[item.id],
}));
