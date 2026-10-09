import React, { useState } from 'react';
import { adminService } from './adminService';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import QuizzesPage from './pages/QuizzesPage';
import ForumPage from './pages/ForumPage';
import './admin.css';

type Page = 'dashboard' | 'users' | 'quizzes' | 'forum';

const AdminApp: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(adminService.isLoggedIn());
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const handleLogout = () => {
    adminService.logout();
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <AdminLogin onLoginSuccess={() => setLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'users':     return <UsersPage />;
      case 'quizzes':   return <QuizzesPage />;
      case 'forum':     return <ForumPage />;
      default:          return <Dashboard />;
    }
  };

  return (
    <AdminLayout
      activePage={activePage}
      onNavigate={(page) => setActivePage(page as Page)}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AdminLayout>
  );
};

export default AdminApp;
