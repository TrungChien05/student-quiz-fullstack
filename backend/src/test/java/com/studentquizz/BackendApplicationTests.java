package com.studentquizz;

import com.studentquizz.dto.CreateQuizRequest;
import com.studentquizz.dto.ForumDto;
import com.studentquizz.dto.QuestionDto;
import com.studentquizz.dto.QuizDto;
import com.studentquizz.model.User;
import com.studentquizz.repository.UserRepository;
import com.studentquizz.service.QuizService;
import com.studentquizz.service.ForumService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private QuizService quizService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.studentquizz.repository.QuizRepository quizRepository;

    @Autowired
    private ForumService forumService;

    @Autowired
    private com.studentquizz.repository.ForumPostRepository forumPostRepository;

    @Test
    void testCreateManualQuizAndGet() {
        // 1. Create and save a user
        User user = User.builder()
                .name("Test User")
                .email("testuser@gmail.com")
                .password("password")
                .role("USER")
                .locked(false)
                .build();
        userRepository.findByEmail(user.getEmail()).ifPresent(existingUser -> {
            quizRepository.findByAuthorIdOrderByCreatedAtDesc(existingUser.getId()).forEach(q -> {
                quizRepository.delete(q);
            });
            userRepository.delete(existingUser);
        });
        user = userRepository.save(user);

        // 2. Mock Security Context
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        org.springframework.security.core.userdetails.User springUser =
                new org.springframework.security.core.userdetails.User(user.getEmail(), "", authorities);
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(springUser, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);

        // 3. Create manual quiz request
        QuestionDto q1 = QuestionDto.builder()
                .content("Question 1")
                .options(List.of("A", "B", "C", "D"))
                .correctAnswer(0)
                .explanation("Exp 1")
                .build();

        CreateQuizRequest req = CreateQuizRequest.builder()
                .title("Manual Quiz Test")
                .category("Khác")
                .description("Manual Quiz Desc")
                .questionCount(1)
                .questions(List.of(q1))
                .build();

        // 4. Create quiz
        QuizDto created = quizService.create(req, null, null);
        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("PENDING", created.getStatus());

        // 5. Get quiz by ID
        QuizDto fetched = quizService.getById(created.getId());
        assertNotNull(fetched);
        assertEquals("Manual Quiz Test", fetched.getTitle());
        assertNotNull(fetched.getQuestions());
        assertEquals(1, fetched.getQuestions().size());
        assertEquals("Question 1", fetched.getQuestions().get(0).getContent());
        assertEquals(4, fetched.getQuestions().get(0).getOptions().size());
        assertEquals("A", fetched.getQuestions().get(0).getOptions().get(0));
    }

    @Test
    void testCreateForumPostWithImageAndDocument() {
        String email = "forum-attachment-test@studentquizz.local";
        userRepository.findByEmail(email).ifPresent(existingUser -> {
            forumPostRepository.findByAuthorIdOrderByCreatedAtDesc(existingUser.getId())
                    .forEach(forumPostRepository::delete);
            userRepository.delete(existingUser);
        });

        User user = userRepository.save(User.builder()
                .name("Forum Attachment Test")
                .email(email)
                .password("password")
                .role("USER")
                .locked(false)
                .build());

        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        org.springframework.security.core.userdetails.User springUser =
                new org.springframework.security.core.userdetails.User(user.getEmail(), "", authorities);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(springUser, null, authorities));

        try {
            ForumDto.CreatePostRequest request = new ForumDto.CreatePostRequest();
            request.setTitle("Bài viết có nhiều đính kèm");
            request.setContent("Nội dung kiểm thử ảnh và tài liệu.");
            request.setTags(List.of("Tài liệu"));
            request.setAttachments(List.of(
                    ForumDto.AttachmentRequest.builder()
                            .url("https://example.com/image.jpg")
                            .name("image.jpg")
                            .type("image/jpeg")
                            .build(),
                    ForumDto.AttachmentRequest.builder()
                            .url("https://example.com/document.pdf")
                            .name("document.pdf")
                            .type("application/pdf")
                            .build()
            ));

            ForumDto.PostResponse created = forumService.createPost(request);

            assertNotNull(created.getId());
            assertEquals(2, created.getAttachments().size());
            assertEquals("image/jpeg", created.getAttachments().get(0).getType());
            assertEquals("application/pdf", created.getAttachments().get(1).getType());
        } finally {
            forumPostRepository.findByAuthorIdOrderByCreatedAtDesc(user.getId())
                    .forEach(forumPostRepository::delete);
            userRepository.delete(user);
            SecurityContextHolder.clearContext();
        }
    }
}
