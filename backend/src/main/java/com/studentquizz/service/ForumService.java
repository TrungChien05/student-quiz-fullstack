package com.studentquizz.service;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.dto.ForumDto;
import com.studentquizz.model.ForumComment;
import com.studentquizz.model.ForumAttachment;
import com.studentquizz.model.ForumPost;
import com.studentquizz.model.ForumPostLike;
import com.studentquizz.model.User;
import com.studentquizz.repository.ForumCommentRepository;
import com.studentquizz.repository.ForumPostLikeRepository;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ForumService {

    private static final int MAX_ATTACHMENTS_PER_POST = 6;

    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;
    private final ForumPostLikeRepository likeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AchievementService achievementService;

    public List<ForumDto.PostResponse> getAllPosts() {
        return postRepository.findByStatusOrderByCreatedAtDesc("APPROVED")
                .stream().map(this::toPostDto).collect(Collectors.toList());
    }

    public ForumDto.PostResponse getPostById(Long id) {
        ForumPost post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!"APPROVED".equals(post.getStatus()) && !canViewUnapproved(post)) {
            throw new RuntimeException("Bài viết chưa được duyệt hoặc không khả dụng.");
        }
        return toPostDto(post);
    }

    @Transactional
    public ForumDto.PostResponse createPost(ForumDto.CreatePostRequest req) {
        User author = getCurrentUser();
        String initialStatus = "ADMIN".equals(author.getRole()) ? "APPROVED" : "PENDING";

        List<String> tags = req.getTags() != null ? req.getTags() : new java.util.ArrayList<>();

        ForumPost post = ForumPost.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .tags(tags)
                .author(author)
                .status(initialStatus)
                .attachmentUrl(req.getAttachmentUrl())
                .attachmentName(req.getAttachmentName())
                .attachmentType(req.getAttachmentType())
                .linkUrl(req.getLinkUrl())
                .build();

        List<ForumDto.AttachmentRequest> requestedAttachments =
                req.getAttachments() != null ? new ArrayList<>(req.getAttachments()) : new ArrayList<>();

        // Backward compatibility for clients that still send the original single attachment fields.
        if (requestedAttachments.isEmpty()
                && req.getAttachmentUrl() != null
                && !req.getAttachmentUrl().isBlank()) {
            requestedAttachments.add(ForumDto.AttachmentRequest.builder()
                    .url(req.getAttachmentUrl())
                    .name(req.getAttachmentName())
                    .type(req.getAttachmentType())
                    .build());
        }

        if (requestedAttachments.size() > MAX_ATTACHMENTS_PER_POST) {
            throw new RuntimeException("Mỗi bài viết chỉ được đính kèm tối đa 6 tệp.");
        }

        List<ForumAttachment> attachments = new ArrayList<>();
        for (ForumDto.AttachmentRequest attachment : requestedAttachments) {
            if (attachment == null
                    || attachment.getUrl() == null || attachment.getUrl().isBlank()
                    || attachment.getName() == null || attachment.getName().isBlank()
                    || attachment.getType() == null || attachment.getType().isBlank()) {
                throw new RuntimeException("Thông tin tệp đính kèm không hợp lệ.");
            }
            attachments.add(ForumAttachment.builder()
                    .post(post)
                    .url(attachment.getUrl().trim())
                    .name(attachment.getName().trim())
                    .type(attachment.getType().trim())
                    .build());
        }
        post.setAttachments(attachments);

        ForumPost savedPost = postRepository.save(post);
        achievementService.evaluateForumBadges(author.getId());
        return toPostDto(savedPost);
    }

    @Transactional
    public ForumDto.LikeResponse toggleLike(Long postId) {
        User user = getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!"APPROVED".equals(post.getStatus())) {
            throw new RuntimeException("Chỉ có thể thích bài viết đã được duyệt.");
        }

        Optional<ForumPostLike> existing = likeRepository.findByPostIdAndUserId(postId, user.getId());
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            postRepository.save(post);
            return ForumDto.LikeResponse.builder()
                    .likeCount(post.getLikeCount())
                    .liked(false)
                    .build();
        }

        likeRepository.save(ForumPostLike.builder().post(post).user(user).build());
        post.setLikeCount(post.getLikeCount() + 1);
        postRepository.save(post);

        // Notify post author
        notificationService.createNotification(
            post.getAuthor(),
            user,
            "LIKE",
            post.getId(),
            null,
            String.format("%s đã thích bài viết của bạn: \"%s\"", user.getName(), post.getTitle())
        );

        return ForumDto.LikeResponse.builder()
                .likeCount(post.getLikeCount())
                .liked(true)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ForumDto.CommentResponse> getComments(Long postId) {
        List<ForumComment> flat = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        Map<Long, ForumDto.CommentResponse> dtoMap = new LinkedHashMap<>();
        List<ForumDto.CommentResponse> roots = new ArrayList<>();

        for (ForumComment comment : flat) {
            ForumDto.CommentResponse dto = toCommentDto(comment);
            dto.setReplies(new ArrayList<>());
            dtoMap.put(comment.getId(), dto);
        }

        for (ForumComment comment : flat) {
            ForumDto.CommentResponse dto = dtoMap.get(comment.getId());
            if (comment.getParent() == null) {
                roots.add(dto);
            } else {
                ForumDto.CommentResponse parentDto = dtoMap.get(comment.getParent().getId());
                if (parentDto != null) {
                    parentDto.getReplies().add(dto);
                } else {
                    roots.add(dto);
                }
            }
        }
        return roots;
    }

    @Transactional
    public ForumDto.CommentResponse addComment(Long postId, ForumDto.CreateCommentRequest req) {
        User author = getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        if (!"APPROVED".equals(post.getStatus())) {
            throw new RuntimeException("Chỉ có thể bình luận bài viết đã được duyệt.");
        }
        if (req.getContent() == null || req.getContent().trim().isEmpty()) {
            throw new RuntimeException("Nội dung bình luận không được để trống.");
        }

        ForumComment parent = null;
        if (req.getParentId() != null) {
            parent = commentRepository.findById(req.getParentId())
                    .orElseThrow(() -> new RuntimeException("Bình luận không tồn tại."));
            if (!parent.getPost().getId().equals(postId)) {
                throw new RuntimeException("Bình luận không thuộc bài viết này.");
            }
        }

        ForumComment comment = ForumComment.builder()
                .content(req.getContent().trim())
                .author(author)
                .post(post)
                .parent(parent)
                .build();
        comment = commentRepository.save(comment);
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        // Send notifications
        if (parent == null) {
            notificationService.createNotification(
                post.getAuthor(),
                author,
                "COMMENT",
                post.getId(),
                null,
                String.format("%s đã bình luận về bài viết của bạn: \"%s\"", author.getName(), post.getTitle())
            );
        } else {
            // Notify the parent comment author
            notificationService.createNotification(
                parent.getAuthor(),
                author,
                "REPLY",
                post.getId(),
                null,
                String.format("%s đã phản hồi bình luận của bạn trong bài viết: \"%s\"", author.getName(), post.getTitle())
            );
            // Notify the post author as well (if different from the parent comment author)
            if (post.getAuthor() != null && parent.getAuthor() != null &&
                !post.getAuthor().getId().equals(parent.getAuthor().getId())) {
                notificationService.createNotification(
                    post.getAuthor(),
                    author,
                    "COMMENT",
                    post.getId(),
                    null,
                    String.format("%s đã bình luận về bài viết của bạn: \"%s\"", author.getName(), post.getTitle())
                );
            }
        }

        return toCommentDto(comment);
    }

    private User getCurrentUser() {
        return getCurrentUserOptional()
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Optional<User> getCurrentUserOptional() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.empty();
        }
        return userRepository.findByEmail(auth.getName());
    }

    private boolean canViewUnapproved(ForumPost post) {
        return getCurrentUserOptional()
                .map(user -> post.getAuthor() != null && (
                        post.getAuthor().getId().equals(user.getId()) || "ADMIN".equals(user.getRole())))
                .orElse(false);
    }

    private ForumDto.PostResponse toPostDto(ForumPost post) {
        boolean liked = getCurrentUserOptional()
                .map(user -> likeRepository.existsByPostIdAndUserId(post.getId(), user.getId()))
                .orElse(false);

        List<ForumDto.AttachmentResponse> attachmentDtos =
                post.getAttachments() == null
                        ? new ArrayList<>()
                        : post.getAttachments().stream()
                                .map(attachment -> ForumDto.AttachmentResponse.builder()
                                        .id(attachment.getId())
                                        .url(attachment.getUrl())
                                        .name(attachment.getName())
                                        .type(attachment.getType())
                                        .build())
                                .collect(Collectors.toCollection(ArrayList::new));

        // Make old posts immediately available through the new array response.
        if (attachmentDtos.isEmpty()
                && post.getAttachmentUrl() != null
                && !post.getAttachmentUrl().isBlank()) {
            attachmentDtos.add(ForumDto.AttachmentResponse.builder()
                    .url(post.getAttachmentUrl())
                    .name(post.getAttachmentName())
                    .type(post.getAttachmentType())
                    .build());
        }

        return ForumDto.PostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .author(toAuthorDto(post.getAuthor()))
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .tags(post.getTags() != null ? new java.util.ArrayList<>(post.getTags()) : new java.util.ArrayList<>())
                .createdAt(post.getCreatedAt())
                .liked(liked)
                .status(post.getStatus())
                .rejectReason(post.getRejectReason())
                .appealMessage(post.getAppealMessage())
                .attachmentUrl(post.getAttachmentUrl())
                .attachmentName(post.getAttachmentName())
                .attachmentType(post.getAttachmentType())
                .attachments(attachmentDtos)
                .linkUrl(post.getLinkUrl())
                .build();
    }

    @Transactional
    public ForumDto.PostResponse appeal(Long id, String message) {
        User author = getCurrentUser();
        ForumPost post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getAuthor().getId().equals(author.getId())) {
            throw new RuntimeException("Bạn không có quyền thực hiện hành động này.");
        }
        if (!"REJECTED".equals(post.getStatus())) {
            throw new RuntimeException("Chỉ có thể khiếu nại những bài bị từ chối.");
        }
        if (message == null || message.trim().isEmpty()) {
            throw new RuntimeException("Vui lòng nhập nội dung khiếu nại.");
        }

        post.setAppealMessage(message.trim());
        post.setStatus("PENDING");
        post.setRejectReason(null);
        return toPostDto(postRepository.save(post));
    }

    private ForumDto.CommentResponse toCommentDto(ForumComment c) {
        String replyTo = null;
        Long parentId = null;
        if (c.getParent() != null) {
            parentId = c.getParent().getId();
            if (c.getParent().getAuthor() != null) {
                replyTo = c.getParent().getAuthor().getName();
            }
        }
        return ForumDto.CommentResponse.builder()
                .id(c.getId())
                .content(c.getContent())
                .author(toAuthorDto(c.getAuthor()))
                .likeCount(c.getLikeCount())
                .createdAt(c.getCreatedAt())
                .parentId(parentId)
                .replyToAuthorName(replyTo)
                .replies(new ArrayList<>())
                .build();
    }

    private AuthorDto toAuthorDto(User user) {
        if (user == null) return null;
        return AuthorDto.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .build();
    }
}
