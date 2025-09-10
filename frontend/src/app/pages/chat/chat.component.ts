import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';
import { Observable, Subscription } from 'rxjs';

declare var SockJS: any;
declare var Stomp: any;

interface ChatMessage {
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  content: string;
  sender: string;
  senderName: string;
  message: string;
  isMine: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  currentUser$: Observable<User | null>;
  stompClient: any = null;
  connected: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscription.unsubscribe();
  }

  connect(): void {
    const socket = new SockJS('http://localhost:8080/ws');
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect({}, (frame: any) => {
      this.connected = true;
      console.log('Connected: ' + frame);

      // Subscribe to public topic
      this.stompClient.subscribe('/topic/public', (message: any) => {
        this.showMessage(JSON.parse(message.body));
      });

      // Send join message
      this.subscription.add(
        this.currentUser$.subscribe(user => {
          if (user && this.stompClient && this.connected) {
            this.stompClient.send('/app/chat.addUser', {}, JSON.stringify({
              sender: user.email,
              type: 'JOIN'
            }));
          }
        })
      );
    }, (error: any) => {
      console.log('Error: ' + error);
      setTimeout(() => {
        this.connect();
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.stompClient !== null) {
      this.stompClient.disconnect();
    }
    this.connected = false;
    console.log('Disconnected');
  }

  sendMessage(): void {
    if (this.newMessage.trim() && this.stompClient && this.connected) {
      const chatMessage = {
        sender: '', // Will be set by current user
        content: this.newMessage,
        type: 'CHAT'
      };

      this.subscription.add(
        this.currentUser$.subscribe(user => {
          if (user) {
            chatMessage.sender = user.email;
            this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
            this.newMessage = '';
          }
        })
      );
    }
  }

  private showMessage(message: ChatMessage): void {
    // Set additional properties for display
    message.senderName = message.senderName || message.sender;
    message.message = message.message || message.content;
    
    // Determine if message is from current user
    this.subscription.add(
      this.currentUser$.subscribe(user => {
        if (user) {
          message.isMine = message.sender === user.email;
        }
      })
    );
    
    this.messages.push(message);
    // Auto scroll to bottom
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}
