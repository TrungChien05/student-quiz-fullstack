package com.studentquizz.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : "Yêu cầu không hợp lệ.";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Yêu cầu không hợp lệ.";
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Đã xảy ra lỗi không xác định.";
        HttpStatus status;

        if (message.contains("not authenticated") || message.equals("User not found")) {
            status = HttpStatus.UNAUTHORIZED;
        } else if (message.contains("không tồn tại")
                || message.contains("Không tìm thấy")
                || message.contains("not found")) {
            status = HttpStatus.NOT_FOUND;
        } else if (message.contains("đã là bạn bè")
                || message.contains("chờ duyệt")
                || message.contains("chính mình")
                || message.contains("chưa kết bạn")
                || message.contains("đã được xử lý")
                || message.contains("Thiếu thông tin")
                || message.contains("không được để trống")
                || message.contains("tối đa 6 tệp")
                || message.contains("tệp đính kèm không hợp lệ")
                || message.contains("chỉ có thể nhắn tin")) {
            status = HttpStatus.BAD_REQUEST;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        // Log chi tiết để debug trên server
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Đã xảy ra lỗi, vui lòng thử lại."));
    }
}
