import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, Award, Loader2, ChevronRight } from 'lucide-react';
import { quizService } from '../services/quizService';
import './LeaderboardPage.css';

type LeaderboardType = 'active' | 'scores';

interface LeaderboardRow {
  userId: number;
  name: string;
  avatar: string;
  value: number;
}

const LeaderboardPage = () => {
  const [boardType, setBoardType] = useState<LeaderboardType>('active');
  const [list, setList] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        if (boardType === 'active') {
          data = await quizService.getMostActiveLeaderboard(20);
        } else {
          data = await quizService.getTopScoringLeaderboard(20);
        }
        setList(data);
      } catch (err) {
        console.error('Lỗi khi tải bảng xếp hạng:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [boardType]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Split list into Top 3 and Others
  const top3 = list.slice(0, 3);
  const others = list.slice(3);

  // Map top 3 into podium order: [2nd place, 1st place, 3rd place]
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

  return (
    <main className="lb-page">
      <div className="container">
        {/* Header */}
        <header className="lb-header">
          <div className="lb-header__icon">
            <Trophy size={40} className="trophy-gold" />
          </div>
          <h1 className="lb-header__title">Bảng Xếp Hạng</h1>
          <p className="lb-header__subtitle">
            Vinh danh những học viên tích cực làm bài kiểm tra và đạt điểm số tích lũy cao nhất!
          </p>
        </header>

        {/* Board Toggle Tabs */}
        <div className="lb-tabs">
          <button
            type="button"
            className={`lb-tab ${boardType === 'active' ? 'active' : ''}`}
            onClick={() => setBoardType('active')}
          >
            <Flame size={16} />
            Top Tích Cực (Số lượt làm)
          </button>
          <button
            type="button"
            className={`lb-tab ${boardType === 'scores' ? 'active' : ''}`}
            onClick={() => setBoardType('scores')}
          >
            <Award size={16} />
            Top Điểm Số (Tổng câu đúng)
          </button>
        </div>

        {loading ? (
          <div className="lb-loading">
            <Loader2 className="spinner spin" size={32} />
            <p>Đang cập nhật bảng xếp hạng...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="lb-empty">
            <Trophy size={48} strokeWidth={1.2} />
            <p>Chưa có dữ liệu xếp hạng. Hãy là người đầu tiên làm bài kiểm tra!</p>
          </div>
        ) : (
          <div className="lb-content">
            {/* ─── Top 3 Podium ─── */}
            {top3.length > 0 && (
              <div className="lb-podium">
                {podiumOrder.map((user) => {
                  const isSecond = user.rank === 2;
                  const isThird = user.rank === 3;
                  
                  let rankIcon = '🥇';
                  let podiumClass = 'lb-podium__item lb-podium__item--first';
                  if (isSecond) {
                    rankIcon = '🥈';
                    podiumClass = 'lb-podium__item lb-podium__item--second';
                  } else if (isThird) {
                    rankIcon = '🥉';
                    podiumClass = 'lb-podium__item lb-podium__item--third';
                  }

                  return (
                    <div key={user.userId} className={podiumClass}>
                      {/* Avatar wrap */}
                      <Link to={`/profile/${user.userId}`} className="lb-podium__avatar-wrap">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="lb-podium__avatar" />
                        ) : (
                          <div className="lb-podium__avatar-placeholder">
                            {getInitials(user.name)}
                          </div>
                        )}
                        <span className="lb-podium__badge">{rankIcon}</span>
                      </Link>

                      {/* Info */}
                      <Link to={`/profile/${user.userId}`} className="lb-podium__name">
                        {user.name}
                      </Link>
                      <span className="lb-podium__value">
                        {user.value} {boardType === 'active' ? 'lượt làm' : 'câu đúng'}
                      </span>

                      {/* Bục cột (Visual Pillar) */}
                      <div className="lb-podium__pillar">
                        <span className="lb-podium__rank-num">{user.rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Others List ─── */}
            {others.length > 0 && (
              <div className="lb-list card">
                {others.map((user, index) => {
                  const rank = index + 4;
                  return (
                    <div key={user.userId} className="lb-row">
                      <div className="lb-row__left">
                        <span className="lb-row__rank">{rank}</span>
                        <Link to={`/profile/${user.userId}`} className="lb-row__user">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="lb-row__avatar" />
                          ) : (
                            <div className="lb-row__avatar-placeholder">
                              {getInitials(user.name)}
                            </div>
                          )}
                          <span className="lb-row__name">{user.name}</span>
                        </Link>
                      </div>

                      <div className="lb-row__right">
                        <span className="lb-row__value">
                          <strong>{user.value}</strong>{' '}
                          {boardType === 'active' ? 'lượt' : 'câu đúng'}
                        </span>
                        <Link to={`/profile/${user.userId}`} className="lb-row__action">
                          Xem hồ sơ <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default LeaderboardPage;
