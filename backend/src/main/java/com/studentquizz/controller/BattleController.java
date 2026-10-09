package com.studentquizz.controller;

import com.studentquizz.dto.BattleDto;
import com.studentquizz.service.BattleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/battles")
@RequiredArgsConstructor
public class BattleController {
    private final BattleService battleService;

    @PostMapping
    public ResponseEntity<BattleDto.RoomResponse> createRoom(
            @Valid @RequestBody BattleDto.CreateRoomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(battleService.createRoom(request.getQuizId()));
    }

    @PostMapping("/join")
    public ResponseEntity<BattleDto.RoomResponse> joinRoom(
            @Valid @RequestBody BattleDto.JoinRoomRequest request) {
        return ResponseEntity.ok(battleService.joinRoom(request.getRoomCode()));
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<BattleDto.RoomResponse> getRoom(@PathVariable String roomCode) {
        return ResponseEntity.ok(battleService.getRoom(roomCode));
    }

    @PostMapping("/{roomCode}/start")
    public ResponseEntity<BattleDto.RoomResponse> startBattle(@PathVariable String roomCode) {
        return ResponseEntity.ok(battleService.startBattle(roomCode));
    }

    @PostMapping("/{roomCode}/answers")
    public ResponseEntity<BattleDto.AnswerResponse> submitAnswer(
            @PathVariable String roomCode,
            @Valid @RequestBody BattleDto.AnswerRequest request) {
        return ResponseEntity.ok(battleService.submitAnswer(roomCode, request));
    }
}
