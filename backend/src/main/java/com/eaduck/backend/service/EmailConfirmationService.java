package com.eaduck.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class EmailConfirmationService {

    @Autowired
    private JavaMailSender mailSender;

    // Usando ConcurrentHashMap como alternativa ao Redis temporariamente
    private final ConcurrentHashMap<String, CodeData> codeStorage = new ConcurrentHashMap<>();
    
    private static final int CODE_EXPIRY_MINUTES = 10; // Código expira em 10 minutos
    
    // Classe interna para armazenar código e timestamp
    private static class CodeData {
        private final String code;
        private final long timestamp;
        
        public CodeData(String code) {
            this.code = code;
            this.timestamp = System.currentTimeMillis();
        }
        
        public String getCode() { return code; }
        
        public boolean isExpired() {
            return System.currentTimeMillis() - timestamp > TimeUnit.MINUTES.toMillis(CODE_EXPIRY_MINUTES);
        }
    }

    /**
     * Gera um código de confirmação de 6 dígitos
     */
    public String generateConfirmationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // Gera número entre 100000 e 999999
        return String.valueOf(code);
    }

    /**
     * Salva o código de confirmação na memória com expiração
     */
    public void saveConfirmationCode(String email, String code) {
        codeStorage.put(email, new CodeData(code));
    }

    /**
     * Verifica se o código fornecido é válido para o e-mail
     */
    public boolean verifyConfirmationCode(String email, String code) {
        CodeData codeData = codeStorage.get(email);
        
        if (codeData == null) {
            return false; // Código não existe
        }
        
        if (codeData.isExpired()) {
            // Remove código expirado
            codeStorage.remove(email);
            return false;
        }
        
        return codeData.getCode().equals(code);
    }

    /**
     * Envia o código de confirmação por e-mail
     */
    public void sendConfirmationEmail(String email, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Confirmação de E-mail - EaDuck");
            message.setText(buildEmailContent(code));
            
            mailSender.send(message);
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao enviar e-mail de confirmação: " + e.getMessage(), e);
        }
    }

    /**
     * Processo completo: gera código, salva no Redis e envia por e-mail
     */
    public String processEmailConfirmation(String email) {
        String code = generateConfirmationCode();
        saveConfirmationCode(email, code);
        sendConfirmationEmail(email, code);
        return code;
    }

    /**
     * Remove código de confirmação (útil para limpeza)
     */
    public void removeConfirmationCode(String email) {
        codeStorage.remove(email);
    }

    /**
     * Remove código após registro bem-sucedido
     */
    public void consumeConfirmationCode(String email) {
        codeStorage.remove(email);
    }

    /**
     * Constrói o conteúdo do e-mail
     */
    private String buildEmailContent(String code) {
        return String.format("""
            Olá!
            
            Você está criando uma conta no EaDuck. Para confirmar seu e-mail, use o código abaixo:
            
            CÓDIGO DE CONFIRMAÇÃO: %s
            
            Este código é válido por %d minutos.
            
            Se você não solicitou esta confirmação, ignore este e-mail.
            
            Atenciosamente,
            Equipe EaDuck
            """, code, CODE_EXPIRY_MINUTES);
    }
}
