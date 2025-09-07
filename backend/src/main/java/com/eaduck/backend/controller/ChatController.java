Deve usar o SOCKET.IO e o SOCKETJSler;

import com.eaduck.backend.model.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Date;

@Controller
public class ChatController {

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        // For now, assume all messages are not from the current user
        // This would need to be determined based on the authenticated user
        chatMessage.setIsMine(false);
        return chatMessage;
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage,
                               SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        chatMessage.setTimestamp(new Date());
        chatMessage.setMessage(chatMessage.getContent());
        chatMessage.setSenderName(chatMessage.getSender());
        chatMessage.setIsMine(false);
        return chatMessage;
    }
}
