# SEO Redirects for Beget

## Что уже добавлено в проект
- Правила 301 находятся в `public/.htaccess`.
- При публикации Vite содержимое `public` копируется в корень `dist`, поэтому `.htaccess` должен попасть в боевой документ-рут.

## Обязательные проверки после деплоя
1. Убедиться, что на хостинге включён `mod_rewrite`.
2. Проверить, что в корне сайта лежит актуальный `.htaccess` из сборки.
3. Проверить ответы сервера:
   - `/case/<slug>` -> `301` -> `/cases/<slug>`
   - `/new/<slug>` -> `301` -> `/news/<slug>`
   - `alazarstudio.ru/*` -> `301` -> `https://xn--80aaa1as7a.xn--p1ai/*`

## Быстрая проверка из консоли
```bash
curl -I https://xn--80aaa1as7a.xn--p1ai/case/test
curl -I https://xn--80aaa1as7a.xn--p1ai/new/test
```

