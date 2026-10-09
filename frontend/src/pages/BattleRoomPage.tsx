import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check, CircleAlert, Clock3, Copy, Crown, Gamepad2, Loader2,
  Medal, Radio, RefreshCw, Sparkles, Trophy, Users, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBattleSocket } from '../hooks/useBattleSocket';
import { battleService } from '../services/battleService';
import type {
  BattleEvent, BattleLeaderboardEntry, BattleParticipant, BattleQuestion, BattleRoom,
} from '../types';
import './BattleRoomPage.css';

const answerSymbols = ['▲', '◆', '●', '■'];

const getError = (error: unknown) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
};

const initials = (name: string) => name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

const PlayerAvatar = ({ player, large = false }: { player: Pick<BattleParticipant, 'name' | 'avatar'>; large?: boolean }) => (
  <div className={`battle-avatar ${large ? 'battle-avatar--large' : ''}`}>
    {player.avatar ? <img src={player.avatar} alt={player.name} /> : <span>{initials(player.name)}</span>}
  </div>
);

const Countdown = ({ deadline }: { deadline: string }) => {
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(deadline) - Date.now()));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Date.parse(deadline) - Date.now()));
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, remaining / 20000));
  return (
    <div className={`battle-timer ${seconds <= 5 ? 'battle-timer--danger' : ''}`} style={{ '--timer-progress': progress } as React.CSSProperties}>
      <div className="battle-timer__inner">
        <span>{seconds}</span>
        <small>giây</small>
      </div>
    </div>
  );
};

const BattleRoomPage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [lastQuestion, setLastQuestion] = useState<BattleQuestion | null>(null);
  const [latestEvent, setLatestEvent] = useState<BattleEvent | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEvent = useCallback((event: BattleEvent) => {
    setRoom(event.room);
    setLatestEvent(event);
    setError('');
    if (event.type === 'QUESTION' && event.room.currentQuestion) {
      setLastQuestion(event.room.currentQuestion);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  }, []);

  const connected = useBattleSocket(roomCode, handleEvent);

  const loadRoom = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await battleService.getRoom(roomCode);
      setRoom(result);
      if (result.currentQuestion) setLastQuestion(result.currentQuestion);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => { void loadRoom(); }, [loadRoom]);

  useEffect(() => {
    if (connected) void loadRoom();
  }, [connected, loadRoom]);

  const leaderboard = useMemo<BattleLeaderboardEntry[]>(() => {
    if (latestEvent?.leaderboard) return latestEvent.leaderboard;
    return (room?.participants || []).map((participant, index) => ({
      rank: index + 1,
      userId: participant.userId,
      name: participant.name,
      avatar: participant.avatar,
      score: participant.score,
      isHost: participant.isHost,
    }));
  }, [latestEvent, room]);

  const copyPin = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const startBattle = async () => {
    if (!roomCode) return;
    setStarting(true);
    setError('');
    try {
      const result = await battleService.startBattle(roomCode);
      setRoom(result);
      if (result.currentQuestion) setLastQuestion(result.currentQuestion);
      setLatestEvent(null);
    } catch (err) {
      setError(getError(err));
    } finally {
      setStarting(false);
    }
  };

  const chooseAnswer = async (answerIndex: number) => {
    const question = room?.currentQuestion;
    if (!roomCode || !question || answered) return;
    setSelectedAnswer(answerIndex);
    setAnswered(true);
    setError('');
    try {
      await battleService.submitAnswer(
        roomCode,
        question.index,
        answerIndex,
        Math.max(0, Date.now() - Date.parse(question.startedAt)),
      );
    } catch (err) {
      setError(getError(err));
    }
  };

  if (loading && !room) {
    return <main className="battle-room battle-room--center"><Loader2 className="battle-spin" size={36} /><p>Đang mở phòng đấu...</p></main>;
  }

  if (!room) {
    return (
      <main className="battle-room battle-room--center">
        <CircleAlert size={42} />
        <h1>Không thể vào phòng</h1>
        <p>{error || 'Phòng đấu không tồn tại.'}</p>
        <button className="battle-primary-button" onClick={() => navigate('/battle')}>Tìm phòng khác</button>
      </main>
    );
  }

  const isHost = room.hostUserId === user?.id;
  const isFinished = room.status === 'FINISHED' || latestEvent?.type === 'FINISHED';
  const isLeaderboard = room.status === 'PLAYING' && !room.currentQuestion;

  return (
    <main className={`battle-room ${isFinished ? 'battle-room--finished' : ''}`}>
      <header className="battle-room__topbar">
        <Link to="/battle" className="battle-room__brand"><Gamepad2 size={20} /> Đấu trí</Link>
        <div className="battle-room__quiz-name">{room.quizTitle}</div>
        <div className={`battle-connection ${connected ? 'battle-connection--online' : ''}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Đã đồng bộ' : 'Đang kết nối'}
        </div>
      </header>

      {room.status === 'WAITING' && (
        <section className="battle-lobby">
          <div className="battle-lobby__intro">
            <span className="battle-kicker"><Radio size={14} /> Phòng đang mở</span>
            <h1>Mời mọi người cùng vào!</h1>
            <p>Chia sẻ mã PIN bên dưới. Người chơi mới sẽ xuất hiện ngay lập tức.</p>
            <button className="battle-room-code" onClick={copyPin} aria-label="Sao chép mã PIN">
              <small>Mã PIN</small>
              <strong>{room.roomCode}</strong>
              <span>{copied ? <><Check size={15} /> Đã sao chép</> : <><Copy size={15} /> Sao chép</>}</span>
            </button>
          </div>

          <div className="battle-lobby__players-wrap">
            <div className="battle-section-heading">
              <div><Users size={20} /><h2>Người chơi</h2><span>{room.participants.length}</span></div>
              <span className="battle-live-dot">Trực tiếp</span>
            </div>
            <div className="battle-player-grid">
              {room.participants.map(participant => (
                <article className="battle-player-card" key={participant.id}>
                  <PlayerAvatar player={participant} />
                  <div><strong>{participant.name}</strong><small>{participant.isHost ? 'Chủ phòng' : 'Sẵn sàng'}</small></div>
                  {participant.isHost && <Crown className="battle-player-card__crown" size={17} />}
                </article>
              ))}
              {room.participants.length < 4 && (
                <div className="battle-player-card battle-player-card--empty"><Loader2 className="battle-spin" size={20} /><span>Đang chờ thêm...</span></div>
              )}
            </div>
          </div>

          <div className="battle-lobby__action">
            {isHost ? (
              <button className="battle-primary-button battle-primary-button--large" onClick={startBattle} disabled={starting}>
                {starting ? <Loader2 className="battle-spin" size={20} /> : <Gamepad2 size={20} />}
                Bắt đầu trận đấu
              </button>
            ) : (
              <div className="battle-waiting-note"><Loader2 className="battle-spin" size={18} /> Đang chờ chủ phòng bắt đầu...</div>
            )}
          </div>
        </section>
      )}

      {room.status === 'PLAYING' && room.currentQuestion && (
        <section className="battle-game">
          <div className="battle-game__meta">
            <span>Câu {room.currentQuestion.index + 1} / {room.currentQuestion.totalQuestions}</span>
            <div className="battle-game__progress"><i style={{ width: `${((room.currentQuestion.index + 1) / room.currentQuestion.totalQuestions) * 100}%` }} /></div>
            <span><Users size={15} /> {room.participants.length}</span>
          </div>
          <div className="battle-game__question-row">
            <Countdown deadline={room.currentQuestion.deadline} />
            <div className="battle-game__question">
              <span>Chọn đáp án đúng</span>
              <h1>{room.currentQuestion.content}</h1>
            </div>
          </div>
          <div className="battle-answer-grid">
            {room.currentQuestion.options.slice(0, 4).map((option, index) => (
              <button
                key={index}
                className={`battle-answer battle-answer--${index} ${selectedAnswer === index ? 'battle-answer--selected' : ''}`}
                disabled={answered}
                onClick={() => chooseAnswer(index)}
              >
                <span className="battle-answer__symbol">{answerSymbols[index]}</span>
                <span>{option}</span>
                {selectedAnswer === index && <Check className="battle-answer__check" size={21} />}
              </button>
            ))}
          </div>
          <div className={`battle-answer-status ${answered ? 'battle-answer-status--visible' : ''}`}>
            <Check size={17} /> Đã ghi nhận câu trả lời — chờ mọi người hoàn thành nhé!
          </div>
        </section>
      )}

      {isLeaderboard && !isFinished && (
        <section className="battle-round-result">
          <span className="battle-kicker"><Clock3 size={14} /> Kết quả câu {room.currentQuestionIndex + 1}</span>
          <h1>Bảng điểm tạm thời</h1>
          {latestEvent?.correctAnswer !== undefined && lastQuestion && (
            <div className="battle-correct-answer">
              <Check size={20} />
              <div><small>Đáp án đúng</small><strong>{lastQuestion.options[latestEvent.correctAnswer]}</strong></div>
            </div>
          )}
          <div className="battle-scoreboard">
            {leaderboard.map(entry => (
              <div className={`battle-score-row ${entry.userId === user?.id ? 'battle-score-row--me' : ''}`} key={entry.userId}>
                <span className="battle-score-row__rank">#{entry.rank}</span>
                <PlayerAvatar player={entry} />
                <strong>{entry.name}{entry.userId === user?.id ? ' (Bạn)' : ''}</strong>
                <span>{entry.score.toLocaleString('vi-VN')} điểm</span>
              </div>
            ))}
          </div>
          <div className="battle-next-question"><Loader2 className="battle-spin" size={18} /> Câu tiếp theo sắp bắt đầu...</div>
        </section>
      )}

      {isFinished && (
        <section className="battle-finish">
          <div className="battle-confetti" aria-hidden="true">
            {Array.from({ length: 30 }, (_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}
          </div>
          <span className="battle-kicker"><Sparkles size={14} /> Trận đấu đã kết thúc</span>
          <h1>Những bộ óc xuất sắc!</h1>
          <p>Chúc mừng tất cả người chơi đã hoàn thành “{room.quizTitle}”.</p>
          <div className="battle-podium">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map(entry => entry && (
              <article className={`battle-podium__place battle-podium__place--${entry.rank}`} key={entry.userId}>
                {entry.rank === 1 && <Crown className="battle-podium__crown" size={36} />}
                <PlayerAvatar player={entry} large />
                <strong>{entry.name}</strong>
                <span>{entry.score.toLocaleString('vi-VN')} điểm</span>
                <div className="battle-podium__step">
                  {entry.rank === 1 ? <Trophy size={30} /> : <Medal size={27} />}
                  <b>{entry.rank}</b>
                </div>
              </article>
            ))}
          </div>
          {leaderboard.length > 3 && (
            <div className="battle-scoreboard battle-scoreboard--final">
              {leaderboard.slice(3).map(entry => (
                <div className={`battle-score-row ${entry.userId === user?.id ? 'battle-score-row--me' : ''}`} key={entry.userId}>
                  <span className="battle-score-row__rank">#{entry.rank}</span>
                  <PlayerAvatar player={entry} />
                  <strong>{entry.name}</strong>
                  <span>{entry.score.toLocaleString('vi-VN')} điểm</span>
                </div>
              ))}
            </div>
          )}
          <div className="battle-finish__actions">
            <button className="battle-primary-button" onClick={() => navigate('/battle')}><RefreshCw size={18} /> Chơi trận mới</button>
            <Link className="battle-secondary-button" to="/explore">Khám phá Quiz</Link>
          </div>
        </section>
      )}

      {error && room && <div className="battle-room-error"><CircleAlert size={17} /> {error}</div>}
    </main>
  );
};

export default BattleRoomPage;
