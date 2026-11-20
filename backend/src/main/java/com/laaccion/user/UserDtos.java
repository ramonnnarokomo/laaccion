package com.laaccion.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** DTOs de gestión de usuarios. Nunca se expone el hash de la contraseña. */
public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(Long id, String email, String displayName, Role role, boolean enabled,
                               Instant lastLoginAt, Instant createdAt) {

        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                    user.isEnabled(), user.getLastLoginAt(), user.getCreatedAt());
        }
    }

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 80) String displayName,
            // BCrypt solo usa los primeros 72 bytes: se limita para no dar una falsa sensación de seguridad.
            @NotBlank @Size(min = 12, max = 72) String password,
            @NotNull Role role) {
    }

    public record UpdateUserRequest(
            @NotBlank @Size(max = 80) String displayName,
            @NotNull Role role,
            @NotNull Boolean enabled) {
    }

    public record ResetPasswordRequest(@NotBlank @Size(min = 12, max = 72) String newPassword) {
    }
}
