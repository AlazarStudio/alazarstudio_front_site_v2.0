'use client'

import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Standart/Layout/Layout'

const stubStyle = {
  width: '100%',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

/**
 * Показывает заглушку тем, кто не авторизован в админке; авторизованным — сайт (пока идёт разработка).
 */
export default function SiteDevGate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={stubStyle}>
        <img src="/logoTime.png" alt="" />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={stubStyle}>
        <img src="/logoTime.png" alt="" />
      </div>
    )
  }

  return <Layout />
}
