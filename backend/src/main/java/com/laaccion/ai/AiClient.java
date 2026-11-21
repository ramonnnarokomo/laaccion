package com.laaccion.ai;

/** Llamada a un modelo de lenguaje: instrucciones del sistema + un mensaje del usuario → texto. */
public interface AiClient {

    /**
     * @return respuesta del modelo
     * @throws com.laaccion.common.error.ServiceUnavailableException si el proveedor falla o no responde
     * @throws com.laaccion.common.error.BadRequestException si la respuesta se corta por ser demasiado larga
     */
    String complete(String system, String user, int maxTokens);
}
