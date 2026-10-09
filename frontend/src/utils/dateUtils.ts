/**
 * dateUtils.ts — Xử lý timezone cho toàn bộ ứng dụng
 * 
 * Backend Java dùng LocalDateTime (không có timezone info), nên khi serialize
 * thành JSON sẽ ra dạng "2026-05-31T10:00:00" (không có Z/+07:00).
 * JavaScript new Date() sẽ parse chuỗi này theo UTC nếu không có suffix,
 * dẫn đến hiển thị lệch múi giờ.
 *
 * Giải pháp: luôn thêm "Z" vào cuối nếu chuỗi chưa có timezone info,
 * để JS hiểu đây là UTC (đồng bộ với server Render chạy UTC).
 */

/**
 * Chuyển chuỗi ISO từ backend thành Date object đúng timezone.
 * Server chạy UTC, nên ta thêm 'Z' để JavaScript hiểu là UTC.
 */
export function parseServerDate(iso: string): Date {
  if (!iso) return new Date();
  // Nếu đã có timezone suffix (Z, +07:00, etc.) thì parse trực tiếp
  if (iso.endsWith('Z') || iso.includes('+') || (iso.length > 10 && iso.lastIndexOf('-') > 10)) {
    return new Date(iso);
  }
  // Thử parse theo UTC trước (thêm 'Z')
  const utcDate = new Date(iso + 'Z');
  
  // Nếu date parse theo UTC bị lệch vào tương lai (hơn 1 phút),
  // nghĩa là server đang chạy cùng timezone với client (local development)
  // và trả về local time mà không có timezone.
  // Lúc này ta fallback về parse theo local time (không thêm 'Z').
  if (utcDate.getTime() > Date.now() + 60000) {
    return new Date(iso);
  }
  
  return utcDate;
}

/**
 * Hiển thị thời gian tương đối dạng "x phút trước"
 */
export function timeAgo(iso: string): string {
  const date = parseServerDate(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  // Quá 7 ngày → hiện ngày giờ cụ thể
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format giờ phút ngắn gọn: "14:30"
 */
export function formatTime(iso: string): string {
  return parseServerDate(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format ngày giờ đầy đủ: "Thứ Sáu, 31/05/2026, 10:30"
 */
export function formatDateTime(iso: string): string {
  return parseServerDate(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format ngày tháng ngắn: "31/05/2026"
 */
export function formatDate(iso: string): string {
  return parseServerDate(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format cho conversation sidebar: "10:30" (hôm nay) hoặc "31/05" (ngày khác)
 */
export function formatConversationTime(iso: string): string {
  const date = parseServerDate(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
