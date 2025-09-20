package com.eaduck.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Configuração para servir arquivos da pasta uploads
        Path uploadsPath = Paths.get("uploads");
        String uploadsLocation = uploadsPath.toFile().getAbsolutePath();
        
        registry.addResourceHandler("/files/**")
                .addResourceLocations("file:" + uploadsLocation + "/")
                .setCachePeriod(3600); // Cache por 1 hora
    }
}
