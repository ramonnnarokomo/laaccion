package com.laaccion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LaAccionApplication {

    public static void main(String[] args) {
        SpringApplication.run(LaAccionApplication.class, args);
    }
}
