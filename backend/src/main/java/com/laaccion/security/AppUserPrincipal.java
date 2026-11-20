package com.laaccion.security;

import com.laaccion.user.Role;
import com.laaccion.user.User;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Usuario autenticado tal y como se guarda en la sesión. */
public final class AppUserPrincipal implements UserDetails, CredentialsContainer {

    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String email;
    private final String displayName;
    private final Role role;
    private final boolean enabled;
    private final Instant lockedUntil;
    private String passwordHash;

    private AppUserPrincipal(Long id, String email, String displayName, Role role, boolean enabled,
            Instant lockedUntil, String passwordHash) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.role = role;
        this.enabled = enabled;
        this.lockedUntil = lockedUntil;
        this.passwordHash = passwordHash;
    }

    public static AppUserPrincipal from(User user) {
        return new AppUserPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                user.isEnabled(), user.getLockedUntil(), user.getPasswordHash());
    }

    public Long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Role getRole() {
        return role;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonLocked() {
        return lockedUntil == null || !lockedUntil.isAfter(Instant.now());
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    /** Spring Security lo llama tras autenticar: el hash no viaja a la sesión. */
    @Override
    public void eraseCredentials() {
        this.passwordHash = null;
    }
}
