import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Search, MessageSquare, ArrowLeft } from 'lucide-react';
import { chatService, type Author } from '../services/chatService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage, Conversation } from '../types';
import { UserProfileModal } from '../components/UserProfileModal';
import { formatTime, formatConversationTime, formatDateTime, parseServerDate } from '../utils/dateUtils';
import './ChatPage.css';

const ChatPage = () => {
  const { friendId } = useParams<{ friendId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Author[]>([]);
  const [activeFriend, setActiveFriend] = useState<Author | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<any>(null);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Fetch initial conversations and friends list
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [convs, friendsList] = await Promise.all([
          chatService.getConversations(),
          chatService.getFriends()
        ]);
        setConversations(convs);
        setFriends(friendsList);

        // If friendId param is provided, set as active friend
        if (friendId) {
          const idNum = parseInt(friendId, 10);
          const foundFriend = friendsList.find(f => f.id === idNum) || 
                              convs.find(c => c.friend.id === idNum)?.friend;
          
          if (foundFriend) {
            setActiveFriend(foundFriend);
          } else {
            // Friend not in list yet — fetch their profile
            try {
              const profile = await userService.getUserProfile(idNum);
              const status = await chatService.getFriendshipStatus(idNum);
              if (status.status === 'ACCEPTED') {
                setActiveFriend({ id: profile.id, name: profile.name, avatar: profile.avatar });
              }
            } catch (err) {
              console.error('Error fetching user profile for chat:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching chat data:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [friendId]);

  // Load chat history & set up polling when active friend changes
  useEffect(() => {
    if (!activeFriend) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const history = await chatService.getChatHistory(activeFriend.id);
        setMessages(history);
        await chatService.markAsRead(activeFriend.id);
        
        // Refresh conversations to update unread badge immediately
        const convs = await chatService.getConversations();
        setConversations(convs);
      } catch (err) {
        console.error('Error loading chat history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();

    // Start polling every 3 seconds for new messages
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }

    pollInterval.current = setInterval(async () => {
      try {
        const history = await chatService.getChatHistory(activeFriend.id);
        // Check if there are new messages before updating to prevent jitter
        setMessages(prev => {
          if (history.length !== prev.length) {
            return history;
          }
          // Check if contents are different
          for (let i = 0; i < history.length; i++) {
            if (history[i].id !== prev[i].id) return history;
          }
          return prev;
        });

        // Periodically refresh conversation list
        const convs = await chatService.getConversations();
        setConversations(convs);
      } catch (err) {
        console.error('Error polling chat messages:', err);
      }
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [activeFriend]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFriend || !newMessage.trim()) return;

    const text = newMessage;
    setNewMessage('');

    try {
      const sent = await chatService.sendMessage(activeFriend.id, text);
      setMessages(prev => [...prev, sent]);
      
      // Refresh conversations list to show last message
      const convs = await chatService.getConversations();
      setConversations(convs);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.response?.data?.message || 'Không thể gửi tin nhắn.');
    }
  };

  const selectFriend = (friend: Author) => {
    setActiveFriend(friend);
    navigate(`/chat/${friend.id}`);
  };

  // Filter friends / conversations based on search
  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = conversations.filter(c =>
    c.friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group friends not in conversation list
  const friendsNotInChat = filteredFriends.filter(f =>
    !conversations.some(c => c.friend.id === f.id)
  );

  const formatMessageTime = (dateStr: string) => formatTime(dateStr);

  if (loading) {
    return (
      <div className="chat-page__loading">
        <div className="spinner"></div>
        <p>Đang tải hộp thư thoại...</p>
      </div>
    );
  }

  return (
    <div className="chat-page container">
      <div className="chat-page__card">
        {/* Sidebar */}
        <div className={`chat-page__sidebar ${activeFriend ? 'hidden-mobile' : ''}`}>
          <div className="chat-page__sidebar-header">
            <h2>Tin nhắn</h2>
            <div className="chat-page__search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-page__sidebar-list">
            {/* Conversations List */}
            {filteredConversations.length > 0 && (
              <div className="chat-page__section">
                <span className="chat-page__section-title">Hội thoại gần đây</span>
                {filteredConversations.map((c) => {
                  const isActive = activeFriend?.id === c.friend.id;
                  return (
                    <div
                      key={c.friend.id}
                      className={`chat-page__item ${isActive ? 'active' : ''} ${c.unreadCount > 0 ? 'unread' : ''}`}
                      onClick={() => selectFriend(c.friend)}
                    >
                      <div className="chat-page__item-avatar-wrapper">
                        {c.friend.avatar ? (
                          <img src={c.friend.avatar} alt={c.friend.name} className="chat-page__item-avatar" />
                        ) : (
                          <div className="chat-page__item-avatar-placeholder">
                            {getInitials(c.friend.name)}
                          </div>
                        )}
                        {c.unreadCount > 0 && <span className="chat-page__unread-badge">{c.unreadCount}</span>}
                      </div>
                      <div className="chat-page__item-info">
                        <div className="chat-page__item-header">
                          <span className="chat-page__item-name">{c.friend.name}</span>
                          <span className="chat-page__item-time">
                            {formatConversationTime(c.lastMessageTime)}
                          </span>
                        </div>
                        <p className="chat-page__item-last">
                          {c.lastMessageSenderId === user?.id ? 'Bạn: ' : ''}
                          {c.lastMessage}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Friends list (to start a new conversation) */}
            {friendsNotInChat.length > 0 && (
              <div className="chat-page__section">
                <span className="chat-page__section-title">Danh sách bạn bè</span>
                {friendsNotInChat.map((f) => (
                  <div
                    key={f.id}
                    className="chat-page__item"
                    onClick={() => selectFriend(f)}
                  >
                    <div className="chat-page__item-avatar-wrapper">
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.name} className="chat-page__item-avatar" />
                      ) : (
                        <div className="chat-page__item-avatar-placeholder">
                          {getInitials(f.name)}
                        </div>
                      )}
                    </div>
                    <div className="chat-page__item-info">
                      <span className="chat-page__item-name">{f.name}</span>
                      <p className="chat-page__item-last text-muted">Bắt đầu trò chuyện</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredConversations.length === 0 && friendsNotInChat.length === 0 && (
              <div className="chat-page__sidebar-empty">
                <MessageSquare size={36} />
                <p>Không tìm thấy bạn bè hoặc hội thoại nào.</p>
                <a href="/explore" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Tìm bạn học</a>
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`chat-page__window ${!activeFriend ? 'hidden-mobile' : ''}`}>
          {activeFriend ? (
            <>
              {/* Chat Header */}
              <div className="chat-page__window-header">
                <button className="chat-page__back-btn" onClick={() => { setActiveFriend(null); navigate('/chat'); }}>
                  <ArrowLeft size={20} />
                </button>
                <div 
                  className="chat-page__header-user"
                  onClick={() => setShowProfileModal(true)}
                  style={{ cursor: 'pointer' }}
                >
                  {activeFriend.avatar ? (
                    <img src={activeFriend.avatar} alt={activeFriend.name} className="chat-page__header-avatar" />
                  ) : (
                    <div className="chat-page__header-avatar-placeholder">
                      {getInitials(activeFriend.name)}
                    </div>
                  )}
                  <div>
                    <h3>{activeFriend.name}</h3>
                    <span className="chat-page__status">Bạn bè</span>
                  </div>
                </div>
              </div>

              {/* Message history */}
              <div className="chat-page__messages">
                {historyLoading && messages.length === 0 ? (
                  <div className="chat-page__messages-loading">
                    <div className="spinner"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-page__messages-empty">
                    <p>Hai bạn đã được kết nối. Hãy gửi lời chào đầu tiên!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.senderId === user?.id;
                    const showTime = index === 0 || 
                      parseServerDate(msg.createdAt).getTime() - parseServerDate(messages[index - 1].createdAt).getTime() > 300000; // 5 mins gap
                    
                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="chat-page__time-divider">
                            {formatDateTime(msg.createdAt)}
                          </div>
                        )}
                        <div className={`chat-page__message-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
                          {!isOwn && (
                            <div 
                              onClick={() => setShowProfileModal(true)} 
                              style={{ cursor: 'pointer' }}
                            >
                              {activeFriend.avatar ? (
                                <img src={activeFriend.avatar} alt={activeFriend.name} className="chat-page__message-avatar" />
                              ) : (
                                <div className="chat-page__message-avatar-placeholder">
                                  {getInitials(activeFriend.name)}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="chat-page__message-bubble-container">
                            <div className="chat-page__message-bubble">
                              <p>{msg.content}</p>
                            </div>
                            <span className="chat-page__message-time">{formatMessageTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form className="chat-page__input-area" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="chat-page__send-btn" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-page__window-empty">
              <MessageSquare size={48} />
              <h3>Hộp thư riêng tư</h3>
              <p>Chọn một người bạn từ danh sách để bắt đầu trò chuyện trực tuyến.</p>
            </div>
          )}
        </div>
      </div>

      {showProfileModal && activeFriend && (
        <UserProfileModal 
          userId={activeFriend.id} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
};

export default ChatPage;
