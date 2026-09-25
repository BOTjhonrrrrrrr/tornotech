package com.tornotech.lms.dto;

public record LoginResponse(
        String token,
        Long id,
        String nombre,
        String rol
) {
}
