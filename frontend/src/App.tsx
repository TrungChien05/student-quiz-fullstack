import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import CreatePage from './pages/CreatePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForumPage from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import QuizPlayPage from './pages/QuizPlayPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BattlePage from './pages/BattlePage';
import BattleRoomPage from './pages/BattleRoomPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AdminApp from './admin/AdminApp';
import NotificationModal from './components/NotificationModal';
import SupportChatbot from './components/SupportChatbot/SupportChatbot';
import BadgeUnlockModal from './components/BadgeUnlockModal';

function App() {
  return (
    <AuthProvider>
      <NotificationModal />
      <BadgeUnlockModal />
      <BrowserRouter>
        <Routes>
          {/* ── Admin routes (no Navbar/Footer) ── */}
          <Route path="/admin/*" element={<AdminApp />} />

          {/* ── User-facing routes ── */}
          <Route path="/*" element={
            <div className="page">
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forum" element={<ForumPage />} />
                <Route path="/forum/:id" element={<ForumPostPage />} />
                <Route path="/quiz/:id" element={<QuizPlayPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />

                <Route path="/battle" element={
                  <ProtectedRoute><BattlePage /></ProtectedRoute>
                } />
                <Route path="/battle/:roomCode" element={
                  <ProtectedRoute><BattleRoomPage /></ProtectedRoute>
                } />
                <Route path="/groups" element={
                  <ProtectedRoute><GroupsPage /></ProtectedRoute>
                } />
                <Route path="/groups/:id" element={
                  <ProtectedRoute><GroupDetailPage /></ProtectedRoute>
                } />

                <Route path="/create" element={
                  <ProtectedRoute><CreatePage /></ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute><ProfilePage /></ProtectedRoute>
                } />
                <Route path="/profile/:userId" element={
                  <ProtectedRoute><ProfilePage /></ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute><ChatPage /></ProtectedRoute>
                } />
                <Route path="/chat/:friendId" element={
                  <ProtectedRoute><ChatPage /></ProtectedRoute>
                } />

                <Route path="*" element={
                  <main style={{
                    minHeight: 'calc(100vh - 64px)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 16
                  }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>404</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Trang bạn tìm không tồn tại.</p>
                    <a href="/" className="btn btn-primary">Về trang chủ</a>
                  </main>
                } />
              </Routes>
              <SupportChatbot />
              <Footer />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
