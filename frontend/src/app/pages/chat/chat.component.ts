import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';
import { ThemeService, Theme } from '../../services/theme.service';
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
  onlineUsers: number = 0;
  private subscription: Subscription = new Subscription();

  // Theme properties
  currentTheme: Theme = 'auto';
  showThemeDropdown: boolean = false;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    console.log('ChatComponent iniciado');
    this.initializeTheme();
    this.connect();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscription.unsubscribe();
  }

  connect(): void {
    console.log('Tentando conectar ao WebSocket...');
    try {
      const socket = new SockJS('http://localhost:8080/ws');
      this.stompClient = Stomp.over(socket);
      
      this.stompClient.connect({}, (frame: any) => {
        console.log('Conectado ao WebSocket:', frame);
        this.connected = true;
        
        // Subscribe to messages
        this.stompClient.subscribe('/topic/public', (message: any) => {
          const chatMessage = JSON.parse(message.body);
          this.handleMessage(chatMessage);
        });

        // Subscribe to user count
        this.stompClient.subscribe('/topic/userCount', (message: any) => {
          const data = JSON.parse(message.body);
          this.onlineUsers = data.count || 0;
        });

        // Send join message
        this.currentUser$.subscribe(user => {
          if (user) {
            this.stompClient.send('/app/chat.addUser', {}, JSON.stringify({
              type: 'JOIN',
              sender: user.email,
              senderName: user.name || user.email,
              content: `${user.name || user.email} entrou no chat`
            }));
          }
        });
      }, (error: any) => {
        console.error('Erro na conexão WebSocket:', error);
        this.connected = false;
      });
    } catch (error) {
      console.error('Erro ao conectar:', error);
      this.connected = false;
    }
  }

  disconnect(): void {
    if (this.stompClient && this.connected) {
      this.currentUser$.subscribe(user => {
        if (user) {
          this.stompClient.send('/app/chat.addUser', {}, JSON.stringify({
            type: 'LEAVE',
            sender: user.email,
            senderName: user.name || user.email,
            content: `${user.name || user.email} saiu do chat`
          }));
        }
      });
      this.stompClient.disconnect();
      this.connected = false;
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.connected || !this.stompClient) {
      return;
    }

    this.currentUser$.subscribe(user => {
      if (user) {
        const chatMessage = {
          type: 'CHAT',
          content: this.newMessage,
          sender: user.email,
          senderName: user.name || user.email
        };

        this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
        this.newMessage = '';
      }
    });
  }

  private handleMessage(message: ChatMessage): void {
    console.log('Mensagem recebida:', message);
    
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    // Check if message is from current user
    this.currentUser$.subscribe(user => {
      if (user) {
        message.isMine = message.sender === user.email;
      }
    });

    this.messages.push(message);
    
    // Scroll to bottom
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  // Theme methods
  private initializeTheme(): void {
    this.subscription.add(
      this.themeService.theme$.subscribe(theme => {
        this.currentTheme = theme;
        this.applyTheme(theme);
      })
    );
  }

  toggleTheme(): void {
    this.showThemeDropdown = !this.showThemeDropdown;
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.showThemeDropdown = false;
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'auto': return '🔄';
      default: return '🔄';
    }
  }

  getThemeLabel(): string {
    switch (this.currentTheme) {
      case 'light': return 'Claro';
      case 'dark': return 'Escuro';
      case 'auto': return 'Automático';
      default: return 'Automático';
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Apply theme-specific classes to body
    document.body.classList.remove('light-theme', 'dark-theme');
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      // Auto mode - follow system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }
  }
}