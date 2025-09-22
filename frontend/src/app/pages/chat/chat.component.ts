import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

interface ChatMessage {
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  content: string;
  sender: string;
  senderName: string;
  senderRole?: string;
  message?: string;
  isMine: boolean;
  timestamp: Date;
  classroomId?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  id?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  currentUser$: Observable<User | null>;
  stompClient: Client | null = null;
  connected: boolean = false;
  onlineUsers: number = 0;
  private subscription: Subscription = new Subscription();

  // Room properties
  classroomId: string | null = null;
  classroomName: string = 'Chat Geral';
  isRoomChat: boolean = false;

  // Theme properties
  currentTheme: Theme = 'auto';
  showThemeDropdown: boolean = false;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    console.log('ChatComponent iniciado');
    this.initializeTheme();
    this.loadRoomInfo();
    this.loadChatHistory();
    this.connect();
  }

  private loadRoomInfo(): void {
    this.route.queryParams.subscribe(params => {
      this.classroomId = params['classroomId'] || null;
      this.classroomName = params['classroomName'] || 'Chat Geral';
      this.isRoomChat = !!this.classroomId;
    });
  }

  private loadChatHistory(): void {
    console.log('Carregando histórico de mensagens...');
    
    if (this.isRoomChat && this.classroomId) {
      // Carregar mensagens da sala
      this.http.get<ChatMessage[]>(`http://localhost:8080/api/chat/room/${this.classroomId}?page=0&size=1000`)
        .subscribe({
          next: (messages) => {
            console.log('Mensagens históricas da sala carregadas:', messages.length);
            this.messages = messages.map(msg => {
              msg.isMine = this.isMessageFromCurrentUser(msg);
              return msg;
            });
            this.cdr.markForCheck();
            this.scrollToBottom();
          },
          error: (error) => {
            console.error('Erro ao carregar mensagens históricas da sala:', error);
          }
        });
    } else {
      // Carregar mensagens do chat geral
      this.http.get<ChatMessage[]>(`http://localhost:8080/api/chat/general?page=0&size=1000`)
        .subscribe({
          next: (messages) => {
            console.log('Mensagens históricas do chat geral carregadas:', messages.length);
            this.messages = messages.map(msg => {
              msg.isMine = this.isMessageFromCurrentUser(msg);
              return msg;
            });
            this.cdr.markForCheck();
            this.scrollToBottom();
          },
          error: (error) => {
            console.error('Erro ao carregar mensagens históricas do chat geral:', error);
          }
        });
    }
  }

  private isMessageFromCurrentUser(message: ChatMessage): boolean {
    let isMine = false;
    this.currentUser$.subscribe(user => {
      if (user) {
        isMine = message.sender === user.email;
      }
    });
    return isMine;
  }

  private scrollToBottom(): void {
    // Usar requestAnimationFrame para garantir que o DOM foi atualizado
    requestAnimationFrame(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
        console.log('Scroll executado. ScrollTop:', element.scrollTop, 'ScrollHeight:', element.scrollHeight);
      } else {
        console.log('messagesContainer não encontrado');
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscription.unsubscribe();
  }

  connect(): void {
    console.log('Tentando conectar ao WebSocket...');
    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        debug: (str: string) => {
          console.log('STOMP Debug:', str);
        },
        onConnect: (frame) => {
          console.log('Conectado ao WebSocket:', frame);
          this.connected = true;
          
          if (this.isRoomChat && this.classroomId) {
            // Room chat
            this.stompClient!.subscribe(`/topic/room.${this.classroomId}`, (message: any) => {
              console.log('Mensagem recebida da sala:', message.body);
              try {
                const chatMessage = JSON.parse(message.body);
                this.handleMessage(chatMessage);
              } catch (error) {
                console.error('Erro ao processar mensagem da sala:', error);
              }
            });

            this.stompClient!.subscribe(`/topic/room.${this.classroomId}.userCount`, (message: any) => {
              try {
                const data = JSON.parse(message.body);
                this.onlineUsers = data.count || 0;
                this.cdr.markForCheck();
              } catch (error) {
                console.error('Erro ao processar contagem de usuários da sala:', error);
              }
            });

            // Send join message to room
            this.currentUser$.pipe(take(1)).subscribe(user => {
              if (user) {
                const joinMessage = {
                  type: 'JOIN',
                  sender: user.email,
                  senderName: user.name || user.email,
                  senderRole: user.role,
                  content: `${user.name || user.email} entrou na sala`,
                  classroomId: this.classroomId
                };
                console.log('Enviando mensagem de entrada na sala:', joinMessage);
                this.stompClient!.publish({
                  destination: '/app/chat.addUser.room',
                  body: JSON.stringify(joinMessage)
                });
              }
            });
          } else {
            // General chat
            this.stompClient!.subscribe('/topic/public', (message: any) => {
              console.log('Mensagem recebida do chat geral:', message.body);
              try {
                const chatMessage = JSON.parse(message.body);
                this.handleMessage(chatMessage);
              } catch (error) {
                console.error('Erro ao processar mensagem do chat geral:', error);
              }
            });

            this.stompClient!.subscribe('/topic/userCount', (message: any) => {
              try {
                const data = JSON.parse(message.body);
                this.onlineUsers = data.count || 0;
                this.cdr.markForCheck();
              } catch (error) {
                console.error('Erro ao processar contagem de usuários:', error);
              }
            });

            // Send join message
            this.currentUser$.pipe(take(1)).subscribe(user => {
              if (user) {
                const joinMessage = {
                  type: 'JOIN',
                  sender: user.email,
                  senderName: user.name || user.email,
                  senderRole: user.role,
                  content: `${user.name || user.email} entrou no chat`
                };
                console.log('Enviando mensagem de entrada no chat geral:', joinMessage);
                this.stompClient!.publish({
                  destination: '/app/chat.addUser',
                  body: JSON.stringify(joinMessage)
                });
              }
            });
          }
        },
        onStompError: (error) => {
          console.error('Erro na conexão WebSocket:', error);
          this.connected = false;
          // Tentar reconectar após 3 segundos
          setTimeout(() => {
            if (!this.connected) {
              console.log('Tentando reconectar...');
              this.connect();
            }
          }, 3000);
        },
        onWebSocketError: (error) => {
          console.error('Erro no WebSocket:', error);
          this.connected = false;
        }
      });
      
      this.stompClient.activate();
    } catch (error) {
      console.error('Erro ao conectar:', error);
      this.connected = false;
    }
  }

  disconnect(): void {
    if (this.stompClient && this.connected) {
      this.currentUser$.subscribe(user => {
        if (user) {
          if (this.isRoomChat && this.classroomId) {
            this.stompClient!.publish({
              destination: '/app/chat.addUser.room',
              body: JSON.stringify({
                type: 'LEAVE',
                sender: user.email,
                senderName: user.name || user.email,
                content: `${user.name || user.email} saiu da sala`,
                classroomId: this.classroomId
              })
            });
          } else {
            this.stompClient!.publish({
              destination: '/app/chat.addUser',
              body: JSON.stringify({
                type: 'LEAVE',
                sender: user.email,
                senderName: user.name || user.email,
                content: `${user.name || user.email} saiu do chat`
              })
            });
          }
        }
      });
      this.stompClient.deactivate();
      this.connected = false;
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) {
      console.log('Mensagem vazia, não enviando');
      return;
    }
    
    if (!this.connected) {
      console.log('Não conectado ao WebSocket, não é possível enviar mensagem');
      return;
    }
    
    if (!this.stompClient) {
      console.log('Cliente STOMP não disponível, não é possível enviar mensagem');
      return;
    }

    // Obter usuário atual de forma síncrona
    let currentUser: User | null = null;
    this.currentUser$.pipe(take(1)).subscribe(user => {
      currentUser = user;
    });

    if (!currentUser) {
      console.log('Usuário não autenticado, não é possível enviar mensagem');
      return;
    }

    // Asserção de tipo para garantir que currentUser não é null
    const user = currentUser as User;

    const messageContent = this.newMessage.trim();
    const messageId = this.generateMessageId();
    
    // Criar mensagem local com status "sending" (como WhatsApp)
    const localMessage: ChatMessage = {
      type: 'CHAT',
      content: messageContent,
      sender: user.email,
      senderName: user.name || user.email,
      isMine: true,
      timestamp: new Date(),
      classroomId: this.classroomId,
      status: 'sending',
      id: messageId
    };
    
    // Adicionar mensagem imediatamente ao array (feedback visual instantâneo)
    this.messages.push(localMessage);
    this.cdr.markForCheck();
    this.scrollToBottom();
    
    // Limpar input imediatamente
    this.newMessage = '';

    // Preparar mensagem para envio
    const chatMessage = {
      type: 'CHAT',
      content: messageContent,
      sender: user.email,
      senderName: user.name || user.email,
      senderRole: user.role,
      classroomId: this.classroomId,
      id: messageId
    };

    console.log('Enviando mensagem:', chatMessage);

    try {
      // Enviar via WebSocket
      if (this.isRoomChat && this.classroomId) {
        this.stompClient!.publish({
          destination: '/app/chat.sendMessage.room',
          body: JSON.stringify(chatMessage)
        });
        console.log('Mensagem enviada para a sala:', this.classroomId);
      } else {
        this.stompClient!.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(chatMessage)
        });
        console.log('Mensagem enviada para o chat geral');
      }
      
      // Atualizar status para "sent" após envio
      setTimeout(() => {
        const messageIndex = this.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          this.messages[messageIndex].status = 'sent';
          this.cdr.markForCheck();
        }
      }, 100);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Atualizar status para "failed"
      const messageIndex = this.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        this.messages[messageIndex].status = 'failed';
        this.cdr.markForCheck();
      }
    }
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private playNotificationSound(): void {
    try {
      // Criar um som de notificação simples usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Não foi possível tocar som de notificação:', error);
    }
  }

  private handleMessage(message: ChatMessage): void {
    console.log('Mensagem recebida via WebSocket:', message.type, message.content);
    
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    // Check if message is from current user de forma síncrona
    let currentUser: User | null = null;
    this.currentUser$.pipe(take(1)).subscribe(user => {
      currentUser = user;
    });

    if (currentUser) {
      const user = currentUser as User;
      message.isMine = message.sender === user.email;
    }

    // Only add CHAT messages to the display, not JOIN/LEAVE messages
    if (message.type === 'CHAT') {
      // Verificar se a mensagem já existe para evitar duplicação
      let messageExists = false;
      
      if (message.isMine && message.id) {
        // Para mensagens próprias com ID, verificar por ID
        messageExists = this.messages.some(m => m.id === message.id);
        
        if (messageExists) {
          // Atualizar status da mensagem existente
          const existingMessageIndex = this.messages.findIndex(m => m.id === message.id);
          if (existingMessageIndex !== -1) {
            this.messages[existingMessageIndex].status = 'delivered';
            this.cdr.markForCheck();
            return;
          }
        }
      } else if (message.isMine && !message.id) {
        // Para mensagens próprias sem ID (enviadas localmente), verificar se já existe
        // uma mensagem com mesmo conteúdo e timestamp próximo
        messageExists = this.messages.some(m => 
          m.isMine && 
          m.content === message.content && 
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
        );
      } else {
        // Para mensagens recebidas, verificar se já existe uma mensagem idêntica
        messageExists = this.messages.some(m => 
          !m.isMine &&
          m.content === message.content && 
          m.sender === message.sender && 
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
        );
      }
      
      if (!messageExists) {
        // Adicionar nova mensagem
        message.status = 'delivered';
        this.messages.push(message);
        
        // Tocar som de notificação para mensagens recebidas
        if (!message.isMine) {
          this.playNotificationSound();
        }
        
        // Forçar atualização da view
        this.forceViewUpdate();
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      } else {
        console.log('Mensagem duplicada ignorada');
      }
    } else {
      console.log('Mensagem de sistema (JOIN/LEAVE) não será exibida:', message.type);
    }
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

  goToChatHub(): void {
    this.router.navigate(['/chat-hub']);
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return message.id || `${message.sender}-${message.timestamp}-${index}`;
  }

  getRoleDisplayName(role: string): string {
    switch (role) {
      case 'STUDENT':
        return 'Estudante';
      case 'TEACHER':
        return 'Professor';
      case 'ADMIN':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  }

  // Método para forçar atualização da view
  private forceViewUpdate(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}