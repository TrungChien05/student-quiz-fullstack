package com.studentquizz.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String avatar;
    private String password;
    private String gender;
    private String interests;
    private String bio;
}
