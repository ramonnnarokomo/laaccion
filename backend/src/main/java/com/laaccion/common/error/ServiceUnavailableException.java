package com.laaccion.common.error;

/** Un servicio externo (p. ej. el asistente de IA) no está disponible o no está configurado. */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
