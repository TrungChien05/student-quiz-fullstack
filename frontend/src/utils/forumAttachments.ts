import type { ForumAttachment, ForumPost } from '../types';

export const getForumAttachments = (post: ForumPost): ForumAttachment[] => {
  if (post.attachments && post.attachments.length > 0) {
    return post.attachments;
  }

  if (post.attachmentUrl) {
    return [{
      url: post.attachmentUrl,
      name: post.attachmentName || 'Tệp đính kèm',
      type: post.attachmentType || 'application/octet-stream',
    }];
  }

  return [];
};

export const isImageAttachment = (attachment: ForumAttachment) => {
  if (attachment.type?.startsWith('image/')) return true;
  const lowerUrl = attachment.url.toLowerCase();
  return /\.(png|jpe?g|gif|webp)(?:$|\?)/i.test(lowerUrl)
    || lowerUrl.includes('/studentquizz/images/')
    || lowerUrl.includes('/image/upload/');
};
