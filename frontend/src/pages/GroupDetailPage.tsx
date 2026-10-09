import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Award, BookOpen, Check, CheckCircle2, ClipboardCopy, Clock3,
  Crown, KeyRound, Loader2, Medal, MoreHorizontal, Play, RefreshCw,
  Shield, ShieldCheck, Trash2, Trophy, UserCheck, UserMinus, UsersRound, XCircle,
} from 'lucide-react';
import { groupService } from '../services/groupService';
import { quizService } from '../services/quizService';
import type { Quiz, StudyGroupDetail, StudyGroupMember } from '../types';
import './GroupDetailPage.css';

type GroupTab = 'quizzes' | 'leaderboard' | 'members';

const errorText = (error: unknown) => {
  const candidate = error as { response?: { data?: { message?: string } } };
  return candidate.response?.data?.message || 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();

const GroupAvatar = ({ name, avatar, large = false }: { name: string; avatar?: string; large?: boolean }) => (
  <span className={`group-detail-avatar ${large ? 'group-detail-avatar--large' : ''}`}>
    {avatar ? <img src={avatar} alt={name} /> : initials(name)}
  </span>
);

const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = Number(id);
  const [detail, setDetail] = useState<StudyGroupDetail | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | ''>('');
  const [tab, setTab] = useState<GroupTab>('quizzes');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(groupId)) return;
    setLoading(true);
    setError('');
    try {
      const groupDetail = await groupService.getGroup(groupId);
      setDetail(groupDetail);
      const groupMembers = await groupService.getMembers(groupId);
      setMembers(groupMembers);
      if (groupDetail.group.canManage) {
        const result = await quizService.getAll(0, 100);
        setAvailableQuizzes(result.content);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const pendingMembers = useMemo(() => members.filter(member => member.status === 'PENDING'), [members]);
  const approvedMembers = useMemo(() => members.filter(member => member.status === 'APPROVED'), [members]);
  const assignedQuizIds = useMemo(() => new Set(detail?.quizzes.map(quiz => quiz.quizId) || []), [detail]);
  const shareableQuizzes = availableQuizzes.filter(quiz => !assignedQuizIds.has(quiz.id));

  const perform = async (key: string, action: () => Promise<void>, successMessage: string) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await loadData();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const approveMember = (member: StudyGroupMember) => perform(
    `approve-${member.membershipId}`,
    async () => { await groupService.approveMember(groupId, member.membershipId); },
    `Đã duyệt ${member.name} vào nhóm.`,
  );

  const removeMember = (member: StudyGroupMember) => perform(
    `remove-${member.membershipId}`,
    async () => { await groupService.removeMember(groupId, member.membershipId); },
    member.status === 'PENDING' ? 'Đã từ chối yêu cầu tham gia.' : `Đã xóa ${member.name} khỏi nhóm.`,
  );

  const changeRole = (member: StudyGroupMember) => {
    const nextRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    return perform(
      `role-${member.membershipId}`,
      async () => { await groupService.updateMemberRole(groupId, member.membershipId, nextRole); },
      nextRole === 'ADMIN' ? `Đã cấp quyền quản trị cho ${member.name}.` : `Đã thu hồi quyền quản trị của ${member.name}.`,
    );
  };

  const shareQuiz = async () => {
    if (!selectedQuizId) return;
    await perform(
      'share-quiz',
      async () => { await groupService.shareQuiz(groupId, selectedQuizId); setSelectedQuizId(''); },
      'Đã giao bài Quiz cho nhóm.',
    );
  };

  const removeQuiz = (assignmentId: number) => perform(
    `quiz-${assignmentId}`,
    async () => { await groupService.removeQuiz(groupId, assignmentId); },
    'Đã gỡ bài Quiz khỏi nhóm.',
  );

  const copyInvite = async () => {
    if (!detail?.group.inviteCode) return;
    await navigator.clipboard.writeText(detail.group.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const regenerateCode = () => perform(
    'invite',
    async () => { await groupService.regenerateInviteCode(groupId); },
    'Đã cấp mã mời mới. Mã cũ không còn hiệu lực.',
  );

  if (loading && !detail) {
    return <main className="group-detail-page group-detail-page--center"><Loader2 className="group-detail-spin" size={34} /><p>Đang mở nhóm học tập...</p></main>;
  }

  if (!detail) {
    return (
      <main className="group-detail-page group-detail-page--center">
        <XCircle size={42} /><h1>Không thể mở nhóm</h1><p>{error || 'Nhóm không tồn tại hoặc bạn chưa được phê duyệt.'}</p>
        <button onClick={() => navigate('/groups')}><ArrowLeft size={17} /> Quay lại danh sách nhóm</button>
      </main>
    );
  }

  const { group, quizzes, leaderboard } = detail;
  const isOwner = group.currentUserRole === 'OWNER';

  return (
    <main className="group-detail-page">
      <section className="group-detail-header">
        <Link to="/groups" className="group-detail-back"><ArrowLeft size={17} /> Nhóm học tập</Link>
        <div className="group-detail-header__main">
          <div className="group-detail-header__icon">{group.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="group-detail-header__labels">
              <span>{group.currentUserRole === 'OWNER' ? <Crown size={13} /> : group.currentUserRole === 'ADMIN' ? <ShieldCheck size={13} /> : <UsersRound size={13} />}
                {group.currentUserRole === 'OWNER' ? 'Trưởng nhóm' : group.currentUserRole === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
              </span>
              <span>{group.memberCount} thành viên</span>
            </div>
            <h1>{group.name}</h1>
            <p>{group.description || 'Không gian học tập chung của các thành viên.'}</p>
          </div>
        </div>

        {group.canManage && group.inviteCode && (
          <div className="group-detail-invite">
            <div><KeyRound size={18} /><span><small>Mã mời nhóm</small><strong>{group.inviteCode}</strong></span></div>
            <button onClick={copyInvite}>{copied ? <Check size={16} /> : <ClipboardCopy size={16} />}{copied ? 'Đã sao chép' : 'Sao chép'}</button>
            {isOwner && <button className="group-detail-invite__refresh" onClick={regenerateCode} disabled={busy === 'invite'}><RefreshCw className={busy === 'invite' ? 'group-detail-spin' : ''} size={15} /> Cấp mã mới</button>}
          </div>
        )}
      </section>

      {(error || notice) && <div className={`group-detail-message ${error ? 'group-detail-message--error' : ''}`}>{error || notice}</div>}

      <section className="group-detail-content">
        <nav className="group-detail-tabs">
          <button className={tab === 'quizzes' ? 'active' : ''} onClick={() => setTab('quizzes')}><BookOpen size={17} /> Bài tập <span>{quizzes.length}</span></button>
          <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}><Trophy size={17} /> Bảng xếp hạng</button>
          <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}><UsersRound size={17} /> Thành viên <span>{approvedMembers.length}</span>{pendingMembers.length > 0 && <i>{pendingMembers.length}</i>}</button>
        </nav>

        {tab === 'quizzes' && (
          <div className="group-detail-panel">
            <div className="group-detail-panel__heading"><div><h2>Bài tập trong nhóm</h2><p>Hoàn thành các Quiz để cải thiện vị trí trên bảng xếp hạng.</p></div></div>
            {group.canManage && (
              <div className="group-share-quiz">
                <div><BookOpen size={20} /><span><strong>Giao bài Quiz</strong><small>Chọn một bài đã được duyệt</small></span></div>
                <select value={selectedQuizId} onChange={event => setSelectedQuizId(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">Chọn bài Quiz...</option>
                  {shareableQuizzes.map(quiz => <option key={quiz.id} value={quiz.id}>{quiz.title} · {quiz.questionCount} câu</option>)}
                </select>
                <button onClick={shareQuiz} disabled={!selectedQuizId || busy === 'share-quiz'}>{busy === 'share-quiz' ? <Loader2 className="group-detail-spin" size={17} /> : <Check size={17} />} Giao bài</button>
              </div>
            )}
            {quizzes.length === 0 ? (
              <div className="group-detail-empty"><BookOpen size={42} /><h3>Chưa có bài tập nào</h3><p>Quản trị viên có thể chọn một Quiz đã duyệt để giao cho nhóm.</p></div>
            ) : (
              <div className="group-quiz-list">
                {quizzes.map(quiz => (
                  <article key={quiz.assignmentId}>
                    <div className="group-quiz-list__icon"><BookOpen size={22} /></div>
                    <div className="group-quiz-list__body">
                      <div className="group-quiz-list__labels"><span>{quiz.category}</span><span>{quiz.questionCount} câu</span></div>
                      <h3>{quiz.title}</h3>
                      <p>Được giao bởi {quiz.assignedByName} · Tác giả {quiz.authorName}</p>
                    </div>
                    <div className={`group-quiz-status ${quiz.completed ? 'group-quiz-status--done' : ''}`}>
                      {quiz.completed ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                      <span><small>{quiz.completed ? 'Đã làm' : 'Chưa làm'}</small>{quiz.completed ? `${quiz.bestScore}/${quiz.totalQuestions} điểm` : 'Bắt đầu ngay'}</span>
                    </div>
                    <Link to={`/quiz/${quiz.quizId}`} className="group-quiz-play"><Play size={16} /> {quiz.completed ? 'Làm lại' : 'Làm bài'}</Link>
                    {group.canManage && <button className="group-icon-danger" onClick={() => removeQuiz(quiz.assignmentId)} disabled={busy === `quiz-${quiz.assignmentId}`} title="Gỡ bài"><Trash2 size={16} /></button>}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="group-detail-panel group-leaderboard-panel">
            <div className="group-detail-panel__heading"><div><h2>Bảng vinh danh</h2><p>Điểm tốt nhất trên mỗi bài tập được tính vào tổng điểm.</p></div><Award size={27} /></div>
            {leaderboard.length === 0 ? <div className="group-detail-empty"><Trophy size={42} /><h3>Chưa có dữ liệu xếp hạng</h3></div> : (
              <>
                <div className="group-mini-podium">
                  {[leaderboard[1], leaderboard[0], leaderboard[2]].map(entry => entry && (
                    <article className={`group-mini-podium__item group-mini-podium__item--${entry.rank}`} key={entry.userId}>
                      {entry.rank === 1 && <Crown size={25} />}
                      <GroupAvatar name={entry.name} avatar={entry.avatar} large />
                      <strong>{entry.name}</strong><span>{entry.totalScore} điểm</span>
                      <div>{entry.rank === 1 ? <Trophy size={22} /> : <Medal size={20} />}<b>{entry.rank}</b></div>
                    </article>
                  ))}
                </div>
                <div className="group-ranking-list">
                  {leaderboard.map(entry => (
                    <div key={entry.userId}>
                      <b>#{entry.rank}</b><GroupAvatar name={entry.name} avatar={entry.avatar} /><span><strong>{entry.name}</strong><small>{entry.completedQuizzes}/{quizzes.length} bài đã hoàn thành</small></span><em>{entry.totalScore} điểm</em>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="group-detail-panel">
            <div className="group-detail-panel__heading"><div><h2>Thành viên nhóm</h2><p>Quản lý yêu cầu tham gia và quyền hạn trong nhóm.</p></div></div>
            {group.canManage && pendingMembers.length > 0 && (
              <section className="group-pending-members">
                <h3><Clock3 size={17} /> Yêu cầu đang chờ <span>{pendingMembers.length}</span></h3>
                {pendingMembers.map(member => (
                  <article key={member.membershipId}>
                    <GroupAvatar name={member.name} avatar={member.avatar} />
                    <div><strong>{member.name}</strong><small>Muốn tham gia nhóm</small></div>
                    <button className="group-member-approve" onClick={() => approveMember(member)} disabled={busy !== null}><UserCheck size={16} /> Duyệt</button>
                    <button className="group-member-reject" onClick={() => removeMember(member)} disabled={busy !== null}><XCircle size={16} /> Từ chối</button>
                  </article>
                ))}
              </section>
            )}
            <div className="group-member-list">
              {approvedMembers.map(member => (
                <article key={member.membershipId}>
                  <GroupAvatar name={member.name} avatar={member.avatar} />
                  <div className="group-member-list__name"><strong>{member.name}</strong><small>Tham gia {new Date(member.joinedAt).toLocaleDateString('vi-VN')}</small></div>
                  <span className={`group-member-role group-member-role--${member.role.toLowerCase()}`}>{member.role === 'OWNER' ? <Crown size={13} /> : member.role === 'ADMIN' ? <ShieldCheck size={13} /> : <UsersRound size={13} />}{member.role === 'OWNER' ? 'Trưởng nhóm' : member.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}</span>
                  {isOwner && member.role !== 'OWNER' && <button className="group-member-role-button" onClick={() => changeRole(member)} disabled={busy !== null}>{member.role === 'ADMIN' ? <Shield size={16} /> : <ShieldCheck size={16} />}{member.role === 'ADMIN' ? 'Thu hồi Admin' : 'Cấp Admin'}</button>}
                  {group.canManage && member.role !== 'OWNER' && <button className="group-icon-danger" onClick={() => removeMember(member)} disabled={busy !== null} title="Xóa thành viên"><UserMinus size={16} /></button>}
                  {!group.canManage && <MoreHorizontal size={18} className="group-member-more" />}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default GroupDetailPage;
