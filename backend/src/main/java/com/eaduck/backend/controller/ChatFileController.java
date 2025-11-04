package com.eaduck.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatFileController {

    // Tipos de arquivo permitidos para chat
    private static final List<String> ALLOWED_IMAGE_TYPES = List.of(
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
    );

    private static final List<String> ALLOWED_AUDIO_TYPES = List.of(
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/webm",
        "audio/x-m4a"
    );

    // Limite máximo: 2GB conforme WhatsApp
    private static final long MAX_FILE_SIZE = 2L * 1024 * 1024 * 1024; // 2GB

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validação do arquivo
            if (file.isEmpty()) {
                response.put("error", "Arquivo vazio");
                return ResponseEntity.badRequest().body(response);
            }

            String contentType = file.getContentType();
            boolean isImage = ALLOWED_IMAGE_TYPES.contains(contentType);
            boolean isAudio = ALLOWED_AUDIO_TYPES.contains(contentType);

            if (!isImage && !isAudio) {
                response.put("error", "Tipo de arquivo não permitido. Apenas imagens e áudios são aceitos.");
                return ResponseEntity.badRequest().body(response);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                response.put("error", "Arquivo muito grande. Tamanho máximo: 2GB");
                return ResponseEntity.badRequest().body(response);
            }

            // Criar diretório de upload se não existir
            String uploadDir = "uploads/chat/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Gerar nome único para o arquivo
            String originalFilename = file.getOriginalFilename();
            String fileName = System.currentTimeMillis() + "_" + 
                             (originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "file");
            Path filePath = uploadPath.resolve(fileName);

            // Salvar arquivo
            Files.write(filePath, file.getBytes());

            // Retornar informações do arquivo
            String fileUrl = "/files/chat/" + fileName;
            response.put("fileUrl", fileUrl);
            response.put("fileName", originalFilename);
            response.put("fileType", contentType);
            response.put("fileSize", file.getSize());
            response.put("messageType", isImage ? "IMAGE" : "AUDIO");

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            response.put("error", "Erro ao salvar arquivo: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        } catch (Exception e) {
            response.put("error", "Erro inesperado: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

