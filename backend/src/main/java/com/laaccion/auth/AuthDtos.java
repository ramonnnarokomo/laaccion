package com.laaccion.auth;

import com.laaccion.security.AppUserPrincipal;
import com.laaccion.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {
    }

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 72) String currentPassword,
            @NotBlank @Size(min = 12, max = 72) String newPassword) {
    }

    public record MeResponse(Long id, String email, String displayName, Role role) {

        public static MeResponse from(AppUserPrincipal principal) {
            return new MeResponse(principal.getId(), principal.getUsername(), principal.getDisplayName(),
                    principal.getRole());
        }
    }
}
