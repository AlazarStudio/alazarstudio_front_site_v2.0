# SEO SSR/Prerender Roadmap

## Цель
Снизить SEO-риски SPA и обеспечить серверную отдачу метаданных/структурированных данных на detail-URL.

## Текущий этап (уже внедрено)
- Единый canonical host.
- Убраны дубли URL в sitemap.
- Добавлены серверные 301 для legacy detail-путей.
- Улучшены внутренние HTML-ссылки и soft-404 поведение на клиенте.

## Следующий этап (MVP)
1. Вынести публичную часть в SSR-совместимый рендер (например Next.js или Vite SSR entry).
2. Для роутов `/cases/:slug`, `/news/:slug`, `/shop/:slug`, `/team/:id` получать данные до рендера страницы.
3. Отдавать на сервере:
   - `title`
   - `meta description`
   - `canonical`
   - OpenGraph
   - JSON-LD (BreadcrumbList + entity schema)

## Этап 2
- Добавить prerender для листингов `/`, `/cases`, `/news`, `/shop`, `/about`, `/contacts`.
- Перенести sitemap на серверную генерацию в CI/CD.
- Добавить автопроверки для SEO-регрессий (snapshot метатегов и schema).

## Критерий готовности
- `View Source` на detail-URL содержит полноценные SEO-теги без выполнения JS.
- Для невалидного slug сервер отдаёт HTTP 404.
- Rich Results Test проходит без критичных ошибок.

