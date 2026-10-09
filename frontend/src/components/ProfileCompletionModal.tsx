import React, { useMemo, useState } from 'react';
import { AlignLeft, Heart, Loader2, Sparkles, UserRound, X } from 'lucide-react';
import { userService, type UserProfile } from '../services/userService';
import './ProfileCompletionModal.css';

interface ProfileCompletionModalProps {
  profile: UserProfile;
  onCompleted: (profile: UserProfile) => void;
  onDismiss: () => void;
}

type Gender = NonNullable<UserProfile['gender']>;

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Không muốn tiết lộ' },
];

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({ profile, onCompleted, onDismiss }) => {
  const [gender, setGender] = useState<Gender | ''>(profile.gender || '');
  const [interests, setInterests] = useState(profile.interests || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const completedCount = useMemo(
    () => [gender, interests.trim(), bio.trim()].filter(Boolean).length,
    [gender, interests, bio],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!gender || !interests.trim() || !bio.trim()) return;
    try {
      setSaving(true);
      setError('');
      const updated = await userService.updateProfile({ gender, interests, bio });
      onCompleted(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Chưa thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pcm-overlay" role="presentation" onMouseDown={onDismiss}>
      <section
        className="pcm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pcm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="pcm-close" onClick={onDismiss} aria-label="Đóng hướng dẫn">
          <X size={18} />
        </button>

        <div className="pcm-hero">
          <span className="pcm-hero__icon"><Sparkles size={24} /></span>
          <p className="pcm-eyebrow">Cá nhân hóa trải nghiệm học tập</p>
          <h2 id="pcm-title">Hoàn thiện trang cá nhân của bạn</h2>
          <p>Chia sẻ một chút về bạn để mọi người trong cộng đồng dễ dàng kết nối hơn.</p>
        </div>

        <div className="pcm-progress" aria-label={`Đã hoàn thành ${completedCount} trên 3 mục`}>
          <div className="pcm-progress__labels">
            <span>Tiến độ hồ sơ</span>
            <strong>{completedCount}/3</strong>
          </div>
          <div className="pcm-progress__track">
            <span style={{ width: `${(completedCount / 3) * 100}%` }} />
          </div>
        </div>

        <form className="pcm-form" onSubmit={handleSubmit}>
          <label className="pcm-field">
            <span><UserRound size={17} /> Giới tính</span>
            <select value={gender} onChange={(event) => setGender(event.target.value as Gender | '')} required>
              <option value="">Chọn thông tin phù hợp</option>
              {GENDER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="pcm-field">
            <span><Heart size={17} /> Sở thích</span>
            <input
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              maxLength={300}
              required
              placeholder="Ví dụ: Toán học, đọc sách, bóng đá"
            />
            <small>{interests.length}/300 ký tự</small>
          </label>

          <label className="pcm-field">
            <span><AlignLeft size={17} /> Giới thiệu bản thân</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={4}
              required
              placeholder="Hãy viết vài câu về mục tiêu học tập hoặc điều bạn muốn chia sẻ..."
            />
            <small>{bio.length}/500 ký tự</small>
          </label>

          {error && <p className="pcm-error" role="alert">{error}</p>}

          <div className="pcm-actions">
            <button type="button" className="pcm-button pcm-button--later" onClick={onDismiss}>Để sau</button>
            <button
              type="submit"
              className="pcm-button pcm-button--save"
              disabled={saving || completedCount < 3}
            >
              {saving ? <><Loader2 size={16} className="pcm-spin" /> Đang lưu...</> : 'Hoàn thiện hồ sơ'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProfileCompletionModal;
