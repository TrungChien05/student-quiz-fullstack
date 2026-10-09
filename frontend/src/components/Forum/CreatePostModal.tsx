import { useState } from 'react';
import axios from 'axios';
import { X, Loader2, Tag, Link2, Paperclip, Image, FileText, Trash2 } from 'lucide-react';
import { forumService } from '../../services/quizService';
import type { ForumAttachment, ForumPost } from '../../types';
import './CreatePostModal.css';

const ALL_TAGS = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Ngoại ngữ', 'Tài liệu', 'Review', 'Hỏi đáp', 'TOEIC', 'Kinh nghiệm'];
const MAX_ATTACHMENTS = 6;

interface Props {
  onClose: () => void;
  onCreated: (post: ForumPost) => void;
}

const CreatePostModal = ({ onClose, onCreated }: Props) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [attachments, setAttachments] = useState<ForumAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 3)
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setError('Mỗi bài viết chỉ được đính kèm tối đa ' + MAX_ATTACHMENTS + ' tệp.');
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setError('Chỉ còn có thể thêm ' + remainingSlots + ' tệp vào bài viết này.');
      return;
    }

    const oversizedFile = filesToUpload.find(file => file.size > 20 * 1024 * 1024);
    if (oversizedFile) {
      setError('Tệp "' + oversizedFile.name + '" vượt quá giới hạn 20MB.');
      return;
    }

    const uploaded: ForumAttachment[] = [];
    const failedNames: string[] = [];
    setUploading(true);
    setError('');

    for (const file of filesToUpload) {
      try {
        uploaded.push(await forumService.uploadAttachment(file));
      } catch (requestError: unknown) {
        failedNames.push(file.name);
        if (axios.isAxiosError(requestError)) {
          const message = requestError.response?.data?.error;
          if (typeof message === 'string') setError(message);
        }
      }
    }

    if (uploaded.length > 0) {
      setAttachments(previous => [...previous, ...uploaded]);
    }
    if (failedNames.length > 0) {
      setError('Không thể tải lên: ' + failedNames.join(', ') + '.');
    }
    setUploading(false);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(previous => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng điền tiêu đề và nội dung.');
      return;
    }
    setLoading(true);
    try {
      const newPost = await forumService.createPost(
        title.trim(),
        content.trim(),
        selectedTags,
        attachments,
        linkUrl.trim() || undefined
      );
      onCreated(newPost);
      window.dispatchEvent(new Event('studentquizz:achievement-updated'));
    } catch (requestError: unknown) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : undefined;
      setError(typeof message === 'string' ? message : 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">Đăng bài mới</h2>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Tiêu đề *</label>
            <input
              id="post-title"
              type="text"
              className="form-input"
              placeholder="Nhập tiêu đề bài viết..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <span className="form-char-count">{title.length}/200</span>
          </div>

          <div className="form-group">
            <label className="form-label">Nội dung *</label>
            <textarea
              id="post-content"
              className="form-textarea"
              placeholder="Chia sẻ câu hỏi, kinh nghiệm hoặc tài liệu của bạn..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              maxLength={2000}
              required
            />
            <span className="form-char-count">{content.length}/2000</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Tag size={14} /> Gắn thẻ (tối đa 3)
            </label>
            <div className="modal-tags">
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`modal-tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                  disabled={!selectedTags.includes(tag) && selectedTags.length >= 3}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* External Link */}
          <div className="form-group">
            <label className="form-label">
              <Link2 size={14} /> Gắn liên kết ngoài (Tùy chọn)
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="Ví dụ: https://example.com/tai-lieu..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
            />
          </div>

          {/* File / Image Attachment */}
          <div className="form-group">
            <label className="form-label">
              <Paperclip size={14} /> Ảnh và tài liệu đính kèm (Tùy chọn)
            </label>

            {uploading && (
              <div className="modal-uploading-preview">
                <div className="modal-uploading-bar">
                  <Loader2 size={16} className="spin" />
                  <span>Đang tải các tệp lên Cloudinary...</span>
                </div>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="modal-attachments-grid">
                {attachments.map((attachment, index) => (
                  attachment.type.startsWith('image/') ? (
                    <div className="modal-img-container" key={attachment.url + '-' + index}>
                      <img src={attachment.url} alt={attachment.name} className="modal-img-preview" />
                      <button
                        type="button"
                        className="modal-img-remove"
                        onClick={() => handleRemoveAttachment(index)}
                        aria-label={'Xóa ' + attachment.name}
                      >
                        <X size={14} />
                      </button>
                      <span className="modal-img-name">{attachment.name}</span>
                    </div>
                  ) : (
                    <div className="modal-attachment-preview" key={attachment.url + '-' + index}>
                      <div className="attachment-info">
                        <FileText size={18} className="attachment-icon-preview text-primary" />
                        <span className="attachment-name" title={attachment.name}>{attachment.name}</span>
                        <button
                          type="button"
                          className="btn-remove-attachment"
                          onClick={() => handleRemoveAttachment(index)}
                          aria-label={'Xóa ' + attachment.name}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {!uploading && attachments.length < MAX_ATTACHMENTS && (
              <div className="modal-file-upload">
                <label className="file-upload-label">
                  <Image size={16} />
                  <span>Chọn ảnh và tài liệu ({attachments.length}/{MAX_ATTACHMENTS})</span>
                  <small>Ảnh, PDF, Office, TXT hoặc CSV; mỗi tệp không quá 20MB</small>
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
                    onChange={handleFileChange}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button
              id="submit-post-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || uploading || !title || !content}
            >
              {loading && <Loader2 size={16} className="spin" />}
              {loading ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
