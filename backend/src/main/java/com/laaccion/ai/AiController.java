package com.laaccion.ai;

import com.laaccion.ai.AiDtos.AssistRequest;
import com.laaccion.ai.AiDtos.AssistResponse;
import com.laaccion.ai.AiDtos.StatusResponse;
import com.laaccion.security.AppUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Asistente de redacción del panel (solo para editores con sesión, como todo /api/v1/admin). */
@RestController
@RequestMapping("/api/v1/admin/ai")
public class AiController {

    private final AiAssistService service;

    public AiController(AiAssistService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public StatusResponse status() {
        return new StatusResponse(service.enabled());
    }

    @PostMapping("/assist")
    public AssistResponse assist(@Valid @RequestBody AssistRequest request, @AuthenticationPrincipal AppUserPrincipal me) {
        return service.assist(request, me);
    }
}
