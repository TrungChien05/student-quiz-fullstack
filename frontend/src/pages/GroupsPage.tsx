import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Check, Clock3, Copy, KeyRound, Loader2,
  Plus, ShieldCheck, Sparkles, UsersRound, X,
} from 'lucide-react';
import { groupService } from '../services/groupService';
import type { StudyGroupSummary } from '../types';
import './GroupsPage.css';

const messageFromError = (error: unknown) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
};

const GroupsPage = () => {
  const [groups, setGroups] = useState<StudyGroupSummary[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    try {
      setGroups(await groupService.getMyGroups());
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadGroups(); }, []);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy('create');
    setError('');
    try {
      const created = await groupService.createGroup(name.trim(), description.trim());
      setGroups(current => [created, ...current]);
      setName('');
      setDescription('');
      setShowCreate(false);
      setSuccess('Nhóm đã được tạo. Bạn có thể chia sẻ mã mời ngay!');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(null);
    }
  };

  const joinGroup = async (event: FormEvent) => {
    event.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      setError('Mã mời phải gồm đúng 8 ký tự.');
      return;
    }
    setBusy('join');
    setError('');
    try {
      const pending = await groupService.joinGroup(code);
      setGroups(current => [pending, ...current]);
      setInviteCode('');
      setSuccess('Đã gửi yêu cầu tham gia. Hãy chờ trưởng nhóm phê duyệt.');
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusy(null);
    }
  };

  const copyInvite = async (group: StudyGroupSummary) => {
    if (!group.inviteCode) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopiedId(group.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  };

  const approvedGroups = groups.filter(group => group.membershipStatus === 'APPROVED');
  const pendingGroups = groups.filter(group => group.membershipStatus === 'PENDING');

  return (
    <main className="groups-page">
      <section className="groups-hero">
        <div>
          <span className="groups-eyebrow"><Sparkles size={14} /> Học cùng nhau, tiến bộ nhanh hơn</span>
          <h1>Nhóm học tập</h1>
          <p>Tạo lớp học riêng, giao Quiz và theo dõi tiến độ của cả nhóm trong một không gian chung.</p>
        </div>
        <button className="groups-primary-button" onClick={() => setShowCreate(true)}>
          <Plus size={19} /> Tạo nhóm mới
        </button>
      </section>

      <section className="groups-join-panel">
        <div className="groups-join-panel__icon"><KeyRound size={23} /></div>
        <div className="groups-join-panel__copy">
          <h2>Bạn có mã mời?</h2>
          <p>Nhập mã 8 ký tự để gửi yêu cầu tham gia nhóm.</p>
        </div>
        <form onSubmit={joinGroup}>
          <input
            aria-label="Mã mời tham gia nhóm"
            value={inviteCode}
            onChange={event => setInviteCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
            maxLength={8}
            placeholder="VD: A3K9M2QX"
          />
          <button disabled={busy !== null}>
            {busy === 'join' ? <Loader2 className="groups-spin" size={18} /> : <ArrowRight size={18} />}
            Tham gia
          </button>
        </form>
      </section>

      {(error || success) && (
        <div className={`groups-message ${error ? 'groups-message--error' : 'groups-message--success'}`}>
          {error || success}
          <button onClick={() => { setError(''); setSuccess(''); }} aria-label="Đóng thông báo"><X size={15} /></button>
        </div>
      )}

      {pendingGroups.length > 0 && (
        <section className="groups-pending">
          <div className="groups-section-title"><Clock3 size={19} /><h2>Đang chờ duyệt</h2><span>{pendingGroups.length}</span></div>
          <div className="groups-pending-list">
            {pendingGroups.map(group => (
              <article key={group.id}>
                <div><strong>{group.name}</strong><span>Trưởng nhóm: {group.owner.name}</span></div>
                <small><Clock3 size={14} /> Đã gửi yêu cầu</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="groups-list-section">
        <div className="groups-section-title"><UsersRound size={20} /><h2>Nhóm của tôi</h2><span>{approvedGroups.length}</span></div>
        {loading ? (
          <div className="groups-loading"><Loader2 className="groups-spin" size={31} /><p>Đang tải các nhóm học tập...</p></div>
        ) : approvedGroups.length === 0 ? (
          <div className="groups-empty">
            <div><UsersRound size={38} /></div>
            <h3>Chưa có nhóm học tập nào</h3>
            <p>Hãy tạo một nhóm mới hoặc nhập mã mời từ bạn bè.</p>
            <button className="groups-primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Tạo nhóm đầu tiên</button>
          </div>
        ) : (
          <div className="groups-card-grid">
            {approvedGroups.map((group, index) => (
              <article className={`groups-card groups-card--${index % 4}`} key={group.id}>
                <div className="groups-card__top">
                  <div className="groups-card__avatar">{group.name.trim().charAt(0).toUpperCase()}</div>
                  <span className={`groups-role groups-role--${group.currentUserRole.toLowerCase()}`}>
                    {group.currentUserRole === 'OWNER' ? 'Trưởng nhóm' : group.currentUserRole === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
                  </span>
                </div>
                <h3>{group.name}</h3>
                <p>{group.description || 'Không gian học tập và chia sẻ Quiz cùng các thành viên.'}</p>
                <div className="groups-card__stats">
                  <span><UsersRound size={15} /> {group.memberCount} thành viên</span>
                  <span><BookOpen size={15} /> {group.quizCount} bài tập</span>
                </div>
                {group.canManage && group.inviteCode && (
                  <button className="groups-card__invite" onClick={() => copyInvite(group)}>
                    <span>Mã mời <b>{group.inviteCode}</b></span>
                    {copiedId === group.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                )}
                <Link to={`/groups/${group.id}`} className="groups-card__link">
                  Vào nhóm <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="groups-modal-overlay" onMouseDown={() => setShowCreate(false)}>
          <form className="groups-create-modal" onSubmit={createGroup} onMouseDown={event => event.stopPropagation()}>
            <button type="button" className="groups-modal-close" onClick={() => setShowCreate(false)} aria-label="Đóng"><X size={18} /></button>
            <div className="groups-create-modal__icon"><ShieldCheck size={25} /></div>
            <h2>Tạo nhóm học tập mới</h2>
            <p>Bạn sẽ là trưởng nhóm và có thể quản lý thành viên, mã mời và bài tập.</p>
            <label>Tên nhóm <span>*</span></label>
            <input value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder="Ví dụ: Lớp Toán 12A1" autoFocus />
            <label>Mô tả</label>
            <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="Mục tiêu và nội dung học tập của nhóm..." />
            <button className="groups-primary-button groups-primary-button--full" disabled={busy !== null || !name.trim()}>
              {busy === 'create' ? <Loader2 className="groups-spin" size={18} /> : <Plus size={18} />}
              Tạo nhóm
            </button>
          </form>
        </div>
      )}
    </main>
  );
};

export default GroupsPage;
