import React, { useEffect, useState } from 'react';
import { adminService } from '../adminService';

interface Stats {
  totalUsers: number;
  totalQuizzes: number;
  totalPosts: number;
  totalPlays: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { icon: '👥', label: 'Tổng người dùng',  value: stats?.totalUsers,   color: 'purple' },
    { icon: '📝', label: 'Tổng bài kiểm tra', value: stats?.totalQuizzes, color: 'green'  },
    { icon: '💬', label: 'Bài viết diễn đàn', value: stats?.totalPosts,   color: 'yellow' },
    { icon: '🎮', label: 'Lượt chơi quiz',    value: stats?.totalPlays,   color: 'pink'   },
  ];

  return (
    <div>
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          Đang tải thống kê...
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {statCards.map(card => (
              <div key={card.label} className={`admin-stat-card ${card.color}`}>
                <div className="admin-stat-icon">{card.icon}</div>
                <div className="admin-stat-value">
                  {(card.value ?? 0).toLocaleString('vi-VN')}
                </div>
                <div className="admin-stat-label">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">📈 Thông tin hệ thống</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: '🌐 Frontend URL', value: 'http://localhost:5173' },
                { label: '⚙️ Backend URL',  value: 'http://localhost:8080' },
                { label: '🗄️ Database',     value: 'H2 In-Memory (Dev)' },
                { label: '🤖 AI Model',      value: 'Gemini 3.5 Flash-Lite' },
                { label: '🔐 Auth',          value: 'JWT Bearer Token' },
                { label: '📦 Version',       value: 'StudentQuizz v1.0' },
              ].map(info => (
                <div key={info.label} style={{
                  background: 'rgba(124, 58, 237, 0.07)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    {info.label}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500 }}>
                    {info.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
