package com.studentquizz.service;

import com.studentquizz.dto.UpdateProfileRequest;
import com.studentquizz.dto.UserProfileResponse;
import com.studentquizz.model.ForumPost;
import com.studentquizz.model.User;
import com.studentquizz.repository.ForumPostRepository;
import com.studentquizz.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class UserProfileEnhancementTests {
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private ForumPostRepository forumPostRepository;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updatesPersonalDetailsAndMarksProfileComplete() {
        User user = createUser("profile-owner");
        authenticate(user);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setGender("female");
        request.setInterests("  Đọc sách, Toán học  ");
        request.setBio("  Mình thích học hỏi mỗi ngày.  ");

        UserProfileResponse response = userService.updateProfile(request);

        assertEquals("FEMALE", response.getGender());
        assertEquals("Đọc sách, Toán học", response.getInterests());
        assertEquals("Mình thích học hỏi mỗi ngày.", response.getBio());
        assertTrue(response.isProfileCompleted());

        UpdateProfileRequest invalid = new UpdateProfileRequest();
        invalid.setGender("UNKNOWN_VALUE");
        assertThrows(IllegalArgumentException.class, () -> userService.updateProfile(invalid));
    }

    @Test
    void publicProfileOnlyReturnsApprovedForumPosts() {
        User author = createUser("post-author");
        User viewer = createUser("post-viewer");
        forumPostRepository.save(ForumPost.builder()
                .title("Bài viết công khai")
                .content("Nội dung đã được duyệt")
                .author(author)
                .status("APPROVED")
                .tags(List.of("Học tập"))
                .build());
        forumPostRepository.save(ForumPost.builder()
                .title("Bài viết đang chờ")
                .content("Nội dung riêng tư")
                .author(author)
                .status("PENDING")
                .tags(List.of("Nháp"))
                .build());
        authenticate(viewer);

        UserProfileResponse response = userService.getUserProfile(author.getId());

        assertEquals(1, response.getTotalPosts());
        assertEquals(1, response.getPosts().size());
        assertEquals("Bài viết công khai", response.getPosts().get(0).getTitle());
    }

    private User createUser(String prefix) {
        long suffix = System.nanoTime();
        return userRepository.save(User.builder()
                .name(prefix)
                .email(prefix + "-" + suffix + "@test.local")
                .password("password")
                .role("USER")
                .build());
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getEmail(), "password", List.of()));
    }
}
