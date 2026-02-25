import { Routes, Route, Navigate } from 'react-router-dom'
import Main from '@/app/Main/Main'
import Main_Page from "./Components/Pages/Main_Page";
import Non_Found_Page from "./Components/Pages/Non_Found_Page";
import Layout from "./Components/Standart/Layout/Layout";
import CustomCursor from "./Components/Cursor/CustomCursor"
import About from "./Components/Pages/About/About";
import Blog from "./Components/Pages/Blog/Blog";
import Shop from "./Components/Pages/Shop/Shop";
import Contacts from "./Components/Pages/Contacts/Contacts";

import NotFound from '@/app/NotFound'
import AdminLayout from '@/app/admin/layout'
import AdminLoginPage from '@/app/admin/login/page'
import AdminSettingsPage from '@/app/admin/settings/page'
import AdminDynamicPage from '@/app/admin/dynamic/[slug]/page'
import AdminDynamicRecordEditPage from '@/app/admin/dynamic/[slug]/[id]/page'

export default function App() {
  return (
    <Routes>

      <Route path="/" element={<Layout />}>
        <Route index element={<Main_Page />} />
        <Route path="/:type/:url_text" element={<Main_Page />} />
        <Route path="/news" element={<Blog />} />
        <Route path="/news/:url_text" element={<Blog />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:url_text" element={<Shop />} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
      </Route>

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="dynamic/:slug/:id" element={<AdminDynamicRecordEditPage />} />
        <Route path="dynamic/:slug" element={<AdminDynamicPage />} />
        <Route path=":slug/:id" element={<AdminDynamicRecordEditPage />} />
        <Route path=":slug" element={<AdminDynamicPage />} />
        <Route index element={<Navigate to="/admin/settings" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
