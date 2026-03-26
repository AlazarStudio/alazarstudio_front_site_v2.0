# SEO Review Report — 2026-03-26

## Scope
- Проверен публичный фронт-проект: `D:/GitHub/alazarstudio_front_site_v2.0`.
- Исключены админ-роуты и файлы `admin`.
- Проверены: `robots.txt`, `sitemap.xml`, роутинг, `meta/OG/canonical`, headings/semantic HTML, изображения, JSON-LD schema, внутренняя связанность и SPA-риски.

## Executive Summary
- Critical: 2
- High: 4
- Medium: 5
- Low: 2

## Findings

- **ID**: SEO-001  
  **Severity**: Critical  
  **Area**: sitemap / canonical  
  **Page/Path**: `public/sitemap.xml` (детальные URL кейсов/новостей)  
  **Current**: В sitemap одновременно присутствуют дублирующие detail-URL: `/case/...` и `/cases/...`, а также `/new/...` и `/news/...`.  
  **Why it is wrong**: Это создаёт дубль-контент и размазывает сигналы ранжирования между разными URL одной сущности. Для sitemap допустим только canonical-вариант.  
  **Fix (exact)**:  
  - Оставить только один формат detail URL:  
    - кейсы: `https://.../cases/<slug>`  
    - новости: `https://.../news/<slug>`  
  - Удалить из `sitemap.xml` все `https://.../case/<slug>` и `https://.../new/<slug>`.  
  - Добавить 301 redirect с `/case/:slug` -> `/cases/:slug` и `/new/:slug` -> `/news/:slug` на уровне веб-сервера.  
  **Implementation hint**: `public/sitemap.xml`, конфиг хостинга/edge redirects (Vercel/NGINX/Cloudflare rules).  
  **Validation**: Проверить, что в sitemap больше нет дублей; `curl -I` для старых URL должен отдавать `301` на canonical.

- **ID**: SEO-002  
  **Severity**: Critical  
  **Area**: indexing / crawlability (SPA)  
  **Page/Path**: detail-роуты `/:type/:url_text` (например `/case/...`, `/new/...`, `/shopitem/...`)  
  **Current**: SEO-теги на detail-страницах выставляются только после клиентской загрузки данных через API (`useSeo` + state), и не гарантированы в исходном HTML ответа.  
  **Why it is wrong**: Для ботов это повышает риск частичной/некорректной индексации, особенно для long-tail detail-страниц (мета/OG/schema могут быть недоступны при первом обходе).  
  **Fix (exact)**:  
  - Внедрить prerender/SSR для публичных роутов (`/cases/:slug`, `/news/:slug`, `/shop/:slug`, `/team/:id`) с серверной генерацией `title`, `description`, `canonical`, OG и JSON-LD.  
  - Минимум: статический prerender ключевых листингов + dynamic rendering для detail-URL.  
  **Implementation hint**: архитектурный слой рендера (сборка/hosting), текущие клиентские хуки: `src/hooks/useSeo.js`, страницы `src/components/Pages/*`.  
  **Validation**: `view-source` detail-URL должен уже содержать корректные `title/meta/link[rel=canonical]/script[type="application/ld+json"]` без исполнения JS.

- **ID**: SEO-003  
  **Severity**: High  
  **Area**: status codes / routing  
  **Page/Path**: `src/components/Pages/Cases/CasesCatalog.jsx`, `src/components/Pages/Shop/Shop.jsx`, `src/components/Pages/Blog/Blog.jsx`, `src/components/Blocks/Cases/Cases.jsx`  
  **Current**: При невалидном slug выполняется клиентский `navigate(...)` на листинг/главную вместо возврата 404-ответа.  
  **Why it is wrong**: Поисковики могут видеть soft-404 (страница есть, но контент не соответствует), что ухудшает качество индекса и сигналов сайта.  
  **Fix (exact)**: Для отсутствующего slug отдавать реальный 404 (серверный статус), либо рендерить dedicated 404-route без silent-redirect.  
  **Implementation hint**: проверка slug-существования на сервере/пререндере; клиентские fallback-ветки в указанных файлах.  
  **Validation**: невалидный detail URL должен возвращать HTTP 404 и страницу `NotFound`.

- **ID**: SEO-004  
  **Severity**: High  
  **Area**: canonical consistency  
  **Page/Path**: `index.html`, `src/lib/seo.js`, `public/sitemap.xml`, `public/robots.txt`  
  **Current**: Используются разные доменные форматы (кириллический `https://алазар.рф` и punycode `https://xn--80aaa1as7a.xn--p1ai`).  
  **Why it is wrong**: Смешение хост-форматов может приводить к дублированию URL-сигналов и неочевидной canonical-логике.  
  **Fix (exact)**: Выбрать единый canonical host-формат (рекомендуется punycode во всех техфайлах) и унифицировать:  
  - `SITE_BASE_URL`  
  - `index.html` canonical/og:url/og:image  
  - `robots.txt` Sitemap URL  
  - `sitemap.xml` `<loc>`  
  **Implementation hint**: `src/lib/seo.js`, `index.html`, `public/robots.txt`, `public/sitemap.xml`.  
  **Validation**: Все canonical/og:url/sitemap loc должны начинаться с одного и того же хоста.

- **ID**: SEO-005  
  **Severity**: High  
  **Area**: meta / title quality  
  **Page/Path**: `src/components/Pages/Blog/Blog.jsx`, `src/components/Pages/Shop/Shop.jsx`, `src/components/Pages/Cases/CasesCatalog.jsx`  
  **Current**: Detail title-шаблоны слишком общие (`— блог`, `— магазин`, `— кейс`) и не содержат сильной интентной добавки (услуга/тип материала/ценность).  
  **Why it is wrong**: Снижает CTR и релевантность для поисковых интентов по карточкам.  
  **Fix (exact)**: Заменить на шаблоны:  
  - Кейс: `"<Название кейса> — кейс по <категория> | Alazar Studio"`  
  - Новость: `"<Название> — статья Alazar Studio"`  
  - Магазин: `"<Название> — цена, описание | Alazar Studio"`  
  **Implementation hint**: генерация `seoTitle` в `CasesCatalog.jsx`, `Blog.jsx`, `Shop.jsx`.  
  **Validation**: Проверка уникальности title в выгрузке URL (краулер/скрипт) + визуальная проверка snippets.

- **ID**: SEO-006  
  **Severity**: High  
  **Area**: internal linking / crawlability  
  **Page/Path**: `src/components/Blocks/CaseCard/CaseCard.jsx`, модальные detail-потоки  
  **Current**: Открытие detail-контента реализовано через кликабельные `div` + `navigate`, без полноценной `<a href>` ссылки в карточке.  
  **Why it is wrong**: Ограничивает стандартный crawl path и передачу веса через HTML-ссылки, особенно в режимах без JS/с частичным JS.  
  **Fix (exact)**: Добавить в каждую карточку каноническую `<a href="...">` (можно как overlay-link), сохранив текущий UX модалок.  
  **Implementation hint**: `src/components/Blocks/CaseCard/CaseCard.jsx`.  
  **Validation**: В DOM карточек должны присутствовать кликабельные `<a>` на detail URL; краулер видит связность без выполнения JS-сценариев.

- **ID**: SEO-007  
  **Severity**: Medium  
  **Area**: robots  
  **Page/Path**: `public/robots.txt`  
  **Current**: Есть глобальный запрет `Disallow: /*?*`.  
  **Why it is wrong**: Полный запрет URL с query может блокировать полезные параметры (например пагинацию/фильтры, если станут indexable), а также мешать отладке индексируемых канонических параметров.  
  **Fix (exact)**:  
  - Либо убрать `Disallow: /*?*`,  
  - либо заменить на точечные запреты служебных параметров (`?sort=`, `?utm_`, `?session=` и т.п.) после утверждения параметрической стратегии.  
  **Implementation hint**: `public/robots.txt`.  
  **Validation**: Проверить robots-тестер и убедиться, что важные страницы не блокируются правилом query.

- **ID**: SEO-008  
  **Severity**: Medium  
  **Area**: headings / semantics  
  **Page/Path**: `src/components/Pages/Cases/CasesCatalog.jsx`, `src/components/Pages/Shop/Shop.jsx`, `src/components/Pages/Blog/Blog.jsx`  
  **Current**: Внутри `<h1>` размещены декоративные `<div>` с изображениями боковой подсветки.  
  **Why it is wrong**: Заголовок должен содержать текстовую сущность; вложенные декоративные блоки засоряют семантику и accessibility-tree.  
  **Fix (exact)**: Вынести декоративные блоки из `<h1>` в соседний контейнер и оставить внутри `<h1>` только текст.  
  **Implementation hint**: указанные файлы страниц + их CSS-модули.  
  **Validation**: Проверка DOM: `h1` содержит только текстовый контент.

- **ID**: SEO-009  
  **Severity**: Medium  
  **Area**: images / accessibility SEO  
  **Page/Path**: `src/components/Pages/Cases/CasesCatalog.jsx`, `src/components/Pages/Shop/Shop.jsx`, `src/components/Pages/Blog/Blog.jsx`  
  **Current**: Декоративные изображения (`sideLight.png`) имеют `alt=""`, но без `aria-hidden="true"`.  
  **Why it is wrong**: Для декоративной графики нужен полный neutral-паттерн (`alt=""` + скрытие от ассистивных технологий), иначе возможен шум для accessibility и вспомогательных индексаций.  
  **Fix (exact)**: Добавить `aria-hidden="true"` на декоративные `<img>` или контейнеры.  
  **Implementation hint**: перечисленные файлы страниц.  
  **Validation**: Lighthouse/Axe: отсутствие замечаний по decorative images.

- **ID**: SEO-010  
  **Severity**: Medium  
  **Area**: schema.org coverage  
  **Page/Path**: публичные листинги и detail-страницы  
  **Current**: Есть базовые схемы (`CollectionPage`, `Article`, `Product`, `CreativeWork`, `Organization`), но нет системной `BreadcrumbList` для всех detail-типов (частично есть), и нет согласованного `WebSite` + `SearchAction`.  
  **Why it is wrong**: Неполная разметка снижает шанс расширенных сниппетов и ухудшает семантическую целостность графа.  
  **Fix (exact)**:  
  - Добавить единый `WebSite` node (с optional `SearchAction`, если есть поиск).  
  - Гарантировать `BreadcrumbList` для каждого detail типа (`case/news/shop/team`).  
  - Проверить единый формат `ImageObject` c `url/caption/description`.  
  **Implementation hint**: `src/components/Pages/Main_Page.jsx`, `src/components/Pages/Cases/CasesCatalog.jsx`, `src/components/Pages/Blog/Blog.jsx`, `src/components/Pages/Shop/Shop.jsx`, `src/components/Pages/Employee/Employee.jsx`.  
  **Validation**: Rich Results Test + Schema Validator без ошибок/предупреждений по ключевым страницам.

- **ID**: SEO-011  
  **Severity**: Low  
  **Area**: external links quality  
  **Page/Path**: `src/components/Blocks/Footer/Footer.jsx`  
  **Current**: Соцсети и юридические ссылки имеют `href="#"` (заглушки).  
  **Why it is wrong**: Пустые ссылки ухудшают quality signals, краулинг и UX.  
  **Fix (exact)**: Подставить реальные URL или временно заменить на `<span>` до появления финальных ссылок.  
  **Implementation hint**: `src/components/Blocks/Footer/Footer.jsx`.  
  **Validation**: В футере отсутствуют пустые `#`-ссылки.

- **ID**: SEO-012  
  **Severity**: Low  
  **Area**: technical hygiene  
  **Page/Path**: `src/components/Pages/Contacts/Contacts.jsx`, `src/components/Pages/Employee/Employee.jsx`, `src/components/Blocks/Cases/CaseDetailsModal.jsx`  
  **Current**: В публичном коде присутствуют `console.log(...)`.  
  **Why it is wrong**: Не прямой SEO-блокер, но ухудшает production hygiene и может усложнять диагностику реальных SEO-ошибок в браузере.  
  **Fix (exact)**: Удалить или обернуть в dev-only guard (`if (import.meta.env.DEV)`).  
  **Implementation hint**: указанные файлы.  
  **Validation**: В production-сборке нет пользовательских логов в консоли.

- **ID**: SEO-013  
  **Severity**: Medium  
  **Area**: indexing / discovered URLs  
  **Page/Path**: `public/sitemap.xml`, `src/App.jsx`  
  **Current**: В sitemap присутствуют URL профилей `/team/:id`, но отсутствует листинг `/team` и нет явного устойчивого HTML-хаба на список сотрудников для поисковиков.  
  **Why it is wrong**: Краулеру сложнее находить/переобходить набор профилей без стабильной хаб-страницы.  
  **Fix (exact)**:  
  - Либо добавить публичную страницу `/team` с ссылками на профили,  
  - либо обеспечить явные HTML-ссылки на все профили с indexable страниц (например `About`).  
  **Implementation hint**: роутинг в `src/App.jsx`, блок команды в `src/components/Blocks/Team_block/*`.  
  **Validation**: Краулер видит путь: главная/о нас -> список команды -> профиль.

## What is already good
- На ключевых публичных страницах внедрён централизованный SEO-хук `useSeo` (title/description/robots/canonical/OG).
- Для 404 используется `noindex,nofollow` (`src/app/NotFound.jsx`) — корректный подход.
- В проекте уже есть JSON-LD на основных сущностях (Organization/WebPage/CollectionPage/Article/Product/Person).
- В `robots.txt` явно закрыты админка и API (`/admin`, `/api`) — это правильно.
- В `sitemap.xml` присутствуют `lastmod/changefreq/priority`.
- В header/footer есть базовая внутренняя навигация на ключевые разделы сайта.

## Priority Fix Plan

### P0 (срочно)
- Удалить дубли canonical URL из `sitemap.xml` (`/case`, `/new`) и оставить единый canonical-путь.
- Настроить 301 redirect с legacy detail-URL на canonical detail-URL.
- Устранить soft-404-поведение для невалидных slug (реальный 404).

### P1 (в ближайший спринт)
- Выровнять формат домена (единый host) во всех SEO-источниках.
- Добавить стабильные HTML `<a href>` на detail-URL из карточек.
- Вынести декоративные элементы из `h1`; нормализовать decorative image pattern.
- Расширить schema-граф до единого и полного для всех detail-типов.

### P2 (улучшения)
- Скорректировать `robots` query-правило на точечное вместо глобального.
- Заменить все `href="#"` на реальные ссылки/неинтерактивные элементы.
- Почистить `console.log` в публичной сборке.
- Усилить шаблоны title/description для CTR и интента.
