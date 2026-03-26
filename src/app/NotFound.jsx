import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'
import { SITE_NAME } from '@/lib/seo'

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
    <main
      style={{
        padding: '2rem',
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#64748b' }}>
        Страница не найдена
      </p>
      <p>
        <Link to="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          На главную
        </Link>
        {' · '}
        <Link to="/admin" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          В админ-панель
        </Link>
      </p>
    </main>
  )
}
