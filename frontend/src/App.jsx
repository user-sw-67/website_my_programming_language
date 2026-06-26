import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import DocsPage from './pages/DocsPage.jsx';
import ApiPage from './pages/ApiPage.jsx';
import LearnPage from './pages/LearnPage.jsx';
import ReactorPage from './pages/ReactorPage.jsx';
import ReactorPostPage from './pages/ReactorPostPage.jsx';
import ReactorCreatePage from './pages/ReactorCreatePage.jsx';
import RepositoriesPage from './pages/RepositoriesPage.jsx';
import IssuesPage from './pages/IssuesPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import NewsDetailPage from './pages/NewsDetailPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import DevelopersPage from './pages/DevelopersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ErrorDemoIndexPage from './pages/ErrorDemoIndexPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ServerErrorPage from './pages/ServerErrorPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import OfflinePage from './pages/OfflinePage.jsx';
import SupportWidget from './components/SupportWidget.jsx';
import BackgroundDecor from './components/BackgroundDecor.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const location = useLocation();
  return (
    <div className="layout">
      <div className="bg-blobs">
        <span />
        <span />
        <span />
      </div>
      <BackgroundDecor />
      <Header />
      <main className="main-content">
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/docs" element={<DocsPage />} />
            {/* не /api-... — vite.config.js проксирует любой путь с префиксом /api прямо в Django (минуя React Router) */}
            <Route path="/rest-api" element={<ApiPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/forum" element={<ReactorPage />} />
            <Route path="/forum/create" element={<ReactorCreatePage />} />
            <Route path="/forum/:slug" element={<ReactorPostPage />} />
            <Route path="/repositories" element={<RepositoriesPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/admin-panel" element={<AdminPage />} />
            <Route path="/error-demo" element={<ErrorDemoIndexPage />} />
            <Route path="/error-demo/404" element={<NotFoundPage />} />
            <Route path="/error-demo/403" element={<ForbiddenPage />} />
            <Route path="/error-demo/500" element={<ServerErrorPage />} />
            <Route path="/error-demo/503" element={<OfflinePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}
