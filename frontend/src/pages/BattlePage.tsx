import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Gamepad2, Hash, Loader2, Sparkles, Users } from 'lucide-react';
import type { Quiz } from '../types';
import { quizService } from '../services/quizService';
import { battleService } from '../services/battleService';
import './BattlePage.css';

const errorMessage = (error: unknown) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
};

const BattlePage = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState<number | ''>('');
  const [loading, setLoading] = useState<'join' | 'create' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    quizService.getAll(0, 100)
      .then(result => {
        setQuizzes(result.content.filter(quiz => (quiz.questionCount || 0) > 0));
      })
      .catch(() => setError('Chưa thể tải danh sách Quiz.'));
  }, []);

  const joinRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError('Mã PIN phải gồm đúng 6 chữ số.');
      return;
    }
    setLoading('join');
    setError('');
    try {
      const room = await battleService.joinRoom(pin);
      navigate(`/battle/${room.roomCode}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    if (!quizId) {
      setError('Hãy chọn một bài Quiz để tạo phòng.');
      return;
    }
    setLoading('create');
    setError('');
    try {
      const room = await battleService.createRoom(quizId);
      navigate(`/battle/${room.roomCode}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="battle-home">
      <div className="battle-home__orb battle-home__orb--one" />
      <div className="battle-home__orb battle-home__orb--two" />
      <section className="battle-home__hero">
        <span className="battle-kicker"><Sparkles size={15} /> Chơi cùng bạn bè theo thời gian thực</span>
        <h1>Đấu trí trực tiếp</h1>
        <p>Vào phòng bằng mã PIN hoặc chọn một Quiz để mở trận đấu của riêng bạn.</p>
        <div className="battle-home__stats">
          <span><Users size={17} /> Tối đa 30 người</span>
          <span><Gamepad2 size={17} /> 20 giây mỗi câu</span>
          <span><Crown size={17} /> Điểm thưởng tốc độ</span>
        </div>
      </section>

      <section className="battle-entry-grid">
        <form className="battle-entry-card battle-entry-card--join" onSubmit={joinRoom}>
          <div className="battle-entry-card__icon"><Hash size={25} /></div>
          <div>
            <span className="battle-entry-card__eyebrow">Người chơi</span>
            <h2>Tham gia phòng</h2>
            <p>Nhập mã PIN 6 số do chủ phòng chia sẻ.</p>
          </div>
          <label htmlFor="battle-pin">Mã PIN phòng</label>
          <input
            id="battle-pin"
            className="battle-pin-input"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={event => setPin(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoComplete="off"
          />
          <button className="battle-action-button" disabled={loading !== null}>
            {loading === 'join' ? <Loader2 className="battle-spin" size={19} /> : <Gamepad2 size={19} />}
            Vào phòng ngay
          </button>
        </form>

        <form className="battle-entry-card battle-entry-card--create" onSubmit={createRoom}>
          <div className="battle-entry-card__icon"><Crown size={25} /></div>
          <div>
            <span className="battle-entry-card__eyebrow">Chủ phòng</span>
            <h2>Tạo trận đấu mới</h2>
            <p>Chọn một Quiz đã được duyệt và mời mọi người cùng chơi.</p>
          </div>
          <label htmlFor="battle-quiz">Bài Quiz</label>
          <select
            id="battle-quiz"
            value={quizId}
            onChange={event => setQuizId(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Chọn bài Quiz...</option>
            {quizzes.map(quiz => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} · {quiz.questionCount} câu
              </option>
            ))}
          </select>
          <button className="battle-action-button battle-action-button--warm" disabled={loading !== null || quizzes.length === 0}>
            {loading === 'create' ? <Loader2 className="battle-spin" size={19} /> : <Sparkles size={19} />}
            Tạo phòng mới
          </button>
        </form>
      </section>

      {error && <div className="battle-error" role="alert">{error}</div>}
    </main>
  );
};

export default BattlePage;
