package com.studentquizz.controller;

import com.studentquizz.dto.AuthorDto;
import com.studentquizz.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/request/{friendId}")
    public ResponseEntity<Map<String, String>> sendFriendRequest(@PathVariable Long friendId) {
        friendshipService.sendFriendRequest(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã gửi lời mời kết bạn."));
    }

    @PostMapping("/accept/{friendId}")
    public ResponseEntity<Map<String, String>> acceptFriendRequest(@PathVariable Long friendId) {
        friendshipService.acceptFriendRequest(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã đồng ý kết bạn."));
    }

    @PostMapping("/decline/{friendId}")
    public ResponseEntity<Map<String, String>> declineFriendRequest(@PathVariable Long friendId) {
        friendshipService.declineFriendRequest(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã từ chối/hủy lời mời kết bạn."));
    }

    @DeleteMapping("/remove/{friendId}")
    public ResponseEntity<Map<String, String>> removeFriend(@PathVariable Long friendId) {
        friendshipService.removeFriend(friendId);
        return ResponseEntity.ok(Map.of("message", "Đã hủy kết bạn."));
    }

    @GetMapping
    public ResponseEntity<List<AuthorDto>> getFriendsList() {
        return ResponseEntity.ok(friendshipService.getFriendsList());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuthorDto>> getUserFriendsList(@PathVariable Long userId) {
        return ResponseEntity.ok(friendshipService.getUserFriendsList(userId));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AuthorDto>> getPendingRequests() {
        return ResponseEntity.ok(friendshipService.getPendingRequests());
    }

    @GetMapping("/status/{friendId}")
    public ResponseEntity<Map<String, String>> getFriendshipStatus(@PathVariable Long friendId) {
        String status = friendshipService.getFriendshipStatus(friendId);
        return ResponseEntity.ok(Map.of("status", status));
    }
}
