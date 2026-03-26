import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { SITE_NAME } from '@/lib/seo'
import classes from './NotFound.module.css'

export default function NotFound() {
  useSeo({
    title: `404 — Страница не найдена | ${SITE_NAME}`,
    description: "Запрошенная страница не найдена. Перейдите на главную страницу Alazar Studio.",
    pathname: "/404",
    robots: "noindex,nofollow",
    ogType: "website",
    ogImage: "/alazar-logo.png",
    schema: null,
    schemaId: "schema-not-found-page",
  })

  return (
    <main className={classes.root}>
      <section className={classes.card}>
        <div className={classes.code}>404</div>
        <h1 className={classes.title}>Страница не найдена</h1>
        <p className={classes.text}>
          Похоже, ссылка устарела или была введена с ошибкой.
          Вернитесь на главную или перейдите в раздел с кейсами.
        </p>
        <div className={classes.actions}>
          <Link to="/" className={classes.btnPrimary}>
            На главную
          </Link>
          <Link to="/cases" className={classes.btnSecondary}>
            Смотреть кейсы
          </Link>
        </div>
      </section>
    </main>
  )
}
