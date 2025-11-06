import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
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

interface MessageReaction {
  emoji: string;
  count: number;
  userEmails?: string[];
}

interface ChatMessage {
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'IMAGE' | 'AUDIO';
  content: string;
  sender: string;
  senderName: string;
  senderRole?: string;
  message?: string;
  isMine: boolean;
  timestamp: Date;
  classroomId?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'viewed' | 'failed';
  id?: string;
  
  // Campos de arquivo
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  
  // Mensagem respondida
  repliedToMessageId?: string;
  repliedToMessage?: ChatMessage;
  
  // Reações
  reactions?: MessageReaction[];
  
  // Espectrograma de áudio
  spectrogram?: string;
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
  
  // Novos estados
  replyingTo: ChatMessage | null = null;
  typingUsers: Map<string, string> = new Map(); // email -> nome
  currentUserEmail: string | null = null;
  
  get typingUsersArray(): Array<{email: string, name: string}> {
    // Filtrar o próprio usuário e retornar apenas outros usuários com nome
    const filtered: Array<{email: string, name: string}> = [];
    this.typingUsers.forEach((name, email) => {
      if (email !== this.currentUserEmail) {
        filtered.push({ email, name });
      }
    });
    return filtered;
  }
  
  get typingDisplayText(): string {
    const typingArray = this.typingUsersArray;
    if (typingArray.length === 0) return '';
    if (typingArray.length === 1) return `${typingArray[0].name} está digitando`;
    if (typingArray.length === 2) return `${typingArray[0].name} e ${typingArray[1].name} estão digitando`;
    if (typingArray.length <= 3) return `${typingArray[0].name}, ${typingArray[1].name} e ${typingArray[2].name} estão digitando`;
    return 'Várias pessoas estão digitando';
  }
  selectedFile: File | null = null;
  selectedFiles: File[] = [];
  filePreviews: { file: File; preview: string }[] = [];
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  recordingStream: MediaStream | null = null;
  recordedAudio: Blob | null = null;
  recordingTime: number = 0;
  showReactionPicker: string | null = null; // messageId
  typingTimer: any = null;
  emojiPickerTimer: any = null;

  // Audio visualization
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  canvasElement: HTMLCanvasElement | null = null;
  canvasContext: CanvasRenderingContext2D | null = null;
    animationFrameId: number | null = null;
    recordedAudioSpectrogram: string | null = null; // Base64 image do espectrograma
    audioPlayingStates: Map<string, boolean> = new Map(); // Estado de reprodução por messageId

    // Room properties
  classroomId: string | null = null;
  classroomName: string = 'Chat Geral';
  isRoomChat: boolean = false;
  accessError: boolean = false;
  accessErrorMessage: string = '';

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

  private isInitialized: boolean = false;

  ngOnInit(): void {
    // Evitar inicialização múltipla
    if (this.isInitialized) {
      console.log('ChatComponent já inicializado, ignorando');
      return;
    }
    
    console.log('ChatComponent iniciado');
    this.isInitialized = true;
    
    // Obter email do usuário atual
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.currentUserEmail = user.email;
      }
    });
    
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
      
      // Validar acesso à sala antes de continuar
      if (this.isRoomChat && this.classroomId) {
        this.validateClassroomAccess(this.classroomId);
      }
    });
  }

  private validateClassroomAccess(classroomId: string): void {
    // Verificar se o usuário tem acesso à sala
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        console.error('Usuário não autenticado');
        this.showAccessError('Você precisa estar autenticado para acessar esta sala.');
        return;
      }

      // Verificar se o usuário tem acesso à sala consultando o backend
      this.http.get<any>(`http://localhost:8080/api/classrooms/${classroomId}`, { observe: 'response' })
        .subscribe({
          next: (response) => {
            if (response.status === 200) {
              const classroom = response.body;
              // Verificar se a sala está inativa e se o usuário não é admin
              if (classroom && !classroom.isActive && user?.role !== 'ADMIN') {
                this.showAccessError('Esta conversa está inativada. Apenas administradores podem acessar conversas inativas. Volte para o HUB e selecione outra conversa.');
                return;
              }
              // Usuário tem acesso
              this.accessError = false;
              this.accessErrorMessage = '';
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error('Erro ao validar acesso à sala:', error);
            if (error.status === 403) {
              // Pode ser que a sala esteja inativa ou o usuário não tenha permissão
              this.showAccessError('Esta conversa está inativada ou você não tem permissão para acessá-la. Apenas administradores podem acessar conversas inativas. Volte para o HUB e selecione outra conversa.');
            } else if (error.status === 404) {
              this.showAccessError('Este bate-papo não existe, foi excluído ou você não tem permissão para acessá-lo! Volte para o HUB e selecione outro.');
            } else {
              this.showAccessError('Erro ao verificar acesso à sala. Tente novamente mais tarde.');
            }
          }
        });
    });
  }

  private showAccessError(message: string): void {
    this.accessError = true;
    this.accessErrorMessage = message;
    this.cdr.markForCheck();
  }

  private chatHistoryLoaded: boolean = false;

  private loadChatHistory(): void {
    // Evitar carregar histórico múltiplas vezes
    if (this.chatHistoryLoaded) {
      console.log('Histórico já carregado, ignorando');
      return;
    }
    
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
            this.chatHistoryLoaded = true;
            this.cdr.markForCheck();
            this.scrollToBottom();
          },
          error: (error) => {
            console.error('Erro ao carregar mensagens históricas da sala:', error);
            if (error.status === 403) {
              this.showAccessError('Este bate-papo não existe, foi excluído ou você não tem permissão para acessá-lo! Volte para o HUB e selecione outro.');
            } else if (error.status === 404) {
              this.showAccessError('Este bate-papo não existe, foi excluído ou você não tem permissão para acessá-lo! Volte para o HUB e selecione outro.');
            } else {
              this.showAccessError('Erro ao carregar mensagens. Tente novamente mais tarde.');
            }
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
            this.chatHistoryLoaded = true;
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
    this.isInitialized = false;
    this.chatHistoryLoaded = false;
    this.disconnect();
    this.subscription.unsubscribe();
  }

  connect(): void {
    // Evitar reconexões desnecessárias
    if (this.connected && this.stompClient && this.stompClient.connected) {
      console.log('Já conectado ao WebSocket, ignorando nova tentativa de conexão');
      return;
    }
    
    // Se já existe um cliente, desconectar primeiro
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (e) {
        console.log('Erro ao desconectar cliente anterior:', e);
      }
    }
    
    console.log('Tentando conectar ao WebSocket...');
    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        debug: (str: string) => {
          console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
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
            
            // Assinar eventos de digitação da sala
            this.stompClient!.subscribe(`/topic/typing.room.${this.classroomId}`, (message: any) => {
              try {
                const data = JSON.parse(message.body);
                const userIdentifier = data.sender || data.senderEmail || data.userEmail;
                const userName = data.senderName || userIdentifier;
                // Não adicionar o próprio usuário
                if (userIdentifier && userIdentifier !== this.currentUserEmail) {
                  if (data.typing) {
                    this.typingUsers.set(userIdentifier, userName);
                  } else {
                    this.typingUsers.delete(userIdentifier);
                  }
                  this.cdr.markForCheck();
                }
              } catch (error) {
                console.error('Erro ao processar evento de digitação da sala:', error);
              }
            });
            
            // Assinar atualizações de reações em tempo real
            this.stompClient!.subscribe(`/topic/reactions.room.${this.classroomId}`, (message: any) => {
              try {
                const data = JSON.parse(message.body);
                const messageId = data.messageId?.toString();
                const reactions = data.reactions;
                
                console.log('[REACTIONS] Broadcast recebido via WebSocket:', { messageId, reactions });
                
                if (messageId && reactions) {
                  const messageIndex = this.messages.findIndex(m => m.id === messageId);
                  if (messageIndex !== -1) {
                    console.log('[REACTIONS] Atualizando mensagem no índice:', messageIndex, 'com reações:', reactions);
                    this.messages[messageIndex].reactions = reactions;
                    this.cdr.markForCheck();
                    console.log('[REACTIONS] Mensagem atualizada com sucesso');
                  } else {
                    console.warn('[REACTIONS] Mensagem não encontrada para atualização via broadcast:', messageId);
                  }
                }
              } catch (error) {
                console.error('[REACTIONS] Erro ao processar atualização de reações:', error);
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
            
            // Assinar eventos de digitação
            this.stompClient!.subscribe('/topic/typing.public', (message: any) => {
              try {
                const data = JSON.parse(message.body);
                const userIdentifier = data.sender || data.senderEmail || data.userEmail;
                const userName = data.senderName || userIdentifier;
                // Não adicionar o próprio usuário
                if (userIdentifier && userIdentifier !== this.currentUserEmail) {
                  if (data.typing) {
                    this.typingUsers.set(userIdentifier, userName);
                  } else {
                    this.typingUsers.delete(userIdentifier);
                  }
                  this.cdr.markForCheck();
                }
              } catch (error) {
                console.error('Erro ao processar evento de digitação:', error);
              }
            });
            
            // Assinar atualizações de reações em tempo real
            this.stompClient!.subscribe('/topic/reactions.public', (message: any) => {
              try {
                const data = JSON.parse(message.body);
                const messageId = data.messageId?.toString();
                const reactions = data.reactions;
                
                console.log('[REACTIONS] Broadcast recebido via WebSocket (chat geral):', { messageId, reactions });
                
                if (messageId && reactions) {
                  const messageIndex = this.messages.findIndex(m => m.id === messageId);
                  if (messageIndex !== -1) {
                    console.log('[REACTIONS] Atualizando mensagem no índice:', messageIndex, 'com reações:', reactions);
                    this.messages[messageIndex].reactions = reactions;
                    this.cdr.markForCheck();
                    console.log('[REACTIONS] Mensagem atualizada com sucesso');
                  } else {
                    console.warn('[REACTIONS] Mensagem não encontrada para atualização via broadcast:', messageId);
                  }
                }
              } catch (error) {
                console.error('[REACTIONS] Erro ao processar atualização de reações:', error);
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
          this.cdr.markForCheck();
          // O STOMP.js já faz reconexão automática, não precisamos chamar connect() novamente
        },
        onWebSocketError: (error) => {
          console.error('Erro no WebSocket:', error);
          this.connected = false;
          this.cdr.markForCheck();
        },
        onDisconnect: () => {
          console.log('Desconectado do WebSocket');
          this.connected = false;
          this.cdr.markForCheck();
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

    // Parar indicador de digitação ao enviar mensagem
    this.stopTyping();

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
    
    // Capturar replyingTo antes de limpar
    const replyingToId = this.replyingTo?.id;
    const replyingToMessage = this.replyingTo ? { ...this.replyingTo } : undefined;
    
    // Criar mensagem local com status "sending" (como WhatsApp)
    const localMessage: ChatMessage = {
      type: 'CHAT',
      content: messageContent,
      sender: user.email,
      senderName: user.name || user.email,
      senderRole: user.role, // Garantir que o role seja incluído na mensagem local
      isMine: true,
      timestamp: new Date(),
      classroomId: this.classroomId,
      status: 'sending',
      id: messageId,
      repliedToMessageId: replyingToId,
      repliedToMessage: replyingToMessage
    };
    
    // Adicionar mensagem imediatamente ao array (feedback visual instantâneo)
    this.messages.push(localMessage);
    this.cdr.markForCheck();
    this.scrollToBottom();
    
    // Limpar input imediatamente
    this.newMessage = '';
    this.replyingTo = null;

    // Preparar mensagem para envio
    const chatMessage: any = {
      type: 'CHAT',
      content: messageContent,
      sender: user.email,
      senderName: user.name || user.email,
      senderRole: user.role,
      classroomId: this.classroomId,
      id: messageId
    };
    
    // Adicionar mensagem respondida se houver
    if (replyingToId) {
      chatMessage.repliedToMessageId = replyingToId;
    }

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

    // Only add CHAT, IMAGE, AUDIO messages to the display, not JOIN/LEAVE messages
    if (message.type === 'CHAT' || message.type === 'IMAGE' || message.type === 'AUDIO') {
      // Verificar se a mensagem já existe para evitar duplicação
      let messageExists = false;
      let existingMessageIndex = -1;
      
      // Verificar se é mensagem do próprio usuário
      const isMyMessage = message.sender === this.currentUserEmail;
      
      // Primeiro, tentar encontrar por ID (mais confiável)
      if (message.id) {
        existingMessageIndex = this.messages.findIndex(m => m.id === message.id);
        if (existingMessageIndex !== -1) {
          messageExists = true;
          console.log('Mensagem encontrada por ID:', message.id);
        }
      }
      
      // Se não encontrou por ID, verificar por conteúdo, sender e timestamp (para mensagens próprias)
      if (!messageExists && isMyMessage) {
        // Para mensagens próprias, verificar se já existe uma mensagem com status 'sending' ou 'sent'
        // com mesmo conteúdo, sender e timestamp próximo (dentro de 5 segundos)
        const now = new Date(message.timestamp).getTime();
        existingMessageIndex = this.messages.findIndex(m => {
          if (!m.isMine || m.sender !== message.sender) return false;
          
          // Verificar se o conteúdo é igual
          const contentMatch = m.content === message.content || m.content === (message.content || message.message);
          
          // Verificar se o timestamp está próximo (dentro de 5 segundos)
          const timeDiff = Math.abs(new Date(m.timestamp).getTime() - now);
          const timeMatch = timeDiff < 5000;
          
          // Verificar se é uma mensagem que acabou de ser enviada (status sending ou sent)
          const recentStatus = m.status === 'sending' || m.status === 'sent';
          
          return contentMatch && timeMatch && recentStatus;
        });
        
        if (existingMessageIndex !== -1) {
          messageExists = true;
          console.log('Mensagem própria encontrada por conteúdo e timestamp:', message.content);
        }
      }
      
      // Para mensagens de outros usuários, verificar por ID, conteúdo e timestamp
      if (!messageExists && !isMyMessage) {
        const now = new Date(message.timestamp).getTime();
        existingMessageIndex = this.messages.findIndex(m => {
          if (m.isMine || m.sender !== message.sender) return false;
          
          const contentMatch = m.content === message.content || m.content === (message.content || message.message);
          const timeDiff = Math.abs(new Date(m.timestamp).getTime() - now);
          const timeMatch = timeDiff < 3000;
          
          return contentMatch && timeMatch;
        });
        
        if (existingMessageIndex !== -1) {
          messageExists = true;
          console.log('Mensagem de outros encontrada por conteúdo e timestamp');
        }
      }
      
      if (messageExists && existingMessageIndex !== -1) {
        // Atualizar mensagem existente com dados do servidor (incluindo status e repliedToMessage)
        const existingMessage = this.messages[existingMessageIndex];
        
        // Preservar o senderRole da mensagem local se ela existir e for uma mensagem própria
        // Isso garante que o role correto seja mantido mesmo se o backend retornar incorreto
        const preservedSenderRole = isMyMessage && existingMessage.senderRole 
          ? existingMessage.senderRole 
          : (message.senderRole || existingMessage.senderRole);
        
        // Atualizar com o ID do servidor (mais confiável)
        this.messages[existingMessageIndex] = {
          ...existingMessage,
          ...message,
          id: message.id || existingMessage.id, // Usar ID do servidor se disponível
          isMine: true, // Manter como mensagem própria
          senderRole: preservedSenderRole, // Preservar o role correto
          status: message.status || 'delivered', // Atualizar status do servidor
          // Manter repliedToMessage se já existir e a nova mensagem não tiver
          repliedToMessage: message.repliedToMessage || existingMessage.repliedToMessage,
          repliedToMessageId: message.repliedToMessageId || existingMessage.repliedToMessageId
        };
        
        // Se a mensagem tem repliedToMessageId mas não tem repliedToMessage, carregar da lista
        if (message.repliedToMessageId && !this.messages[existingMessageIndex].repliedToMessage) {
          const repliedTo = this.messages.find(m => m.id === message.repliedToMessageId);
          if (repliedTo) {
            this.messages[existingMessageIndex].repliedToMessage = repliedTo;
          }
        }
        
        console.log('Mensagem atualizada (não duplicada):', message.id || existingMessage.id);
        this.cdr.markForCheck();
        return;
      }
      
      if (!messageExists) {
        // Se a mensagem tem repliedToMessageId mas não tem repliedToMessage, carregar da lista
        if (message.repliedToMessageId && !message.repliedToMessage) {
          const repliedTo = this.messages.find(m => m.id === message.repliedToMessageId);
          if (repliedTo) {
            message.repliedToMessage = repliedTo;
          }
        }
        
        // Adicionar nova mensagem
        message.status = message.status || 'delivered';
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
  
  // Sistema de respostas
  replyToMessage(message: ChatMessage): void {
    // Criar uma cópia da mensagem para evitar referências
    this.replyingTo = {
      ...message,
      id: message.id,
      content: message.content || message.message || '',
      sender: message.sender,
      senderName: message.senderName || message.sender
    };
    this.cdr.markForCheck();
    
    // Focar no input de mensagem
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Digite sua mensagem..."]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }
  
  cancelReply(): void {
    this.replyingTo = null;
    this.cdr.markForCheck();
  }
  
  // Sistema de reações
  addReaction(messageId: string, emoji: string): void {
    if (!this.stompClient || !this.connected) {
      console.warn('[REACTIONS] WebSocket não conectado, não é possível adicionar reação');
      return;
    }
    
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        console.warn('[REACTIONS] Usuário não autenticado, não é possível adicionar reação');
        return;
      }
      
      const currentUser = user as User;
      console.log('[REACTIONS] Adicionando reação:', { messageId, emoji, user: currentUser.email });
      
      // Verificar estado atual antes de enviar
      const message = this.messages.find(m => m.id === messageId);
      if (message) {
        const existingReaction = message.reactions?.find((r: MessageReaction) => r.emoji === emoji);
        const userAlreadyReacted = existingReaction?.userEmails?.includes(currentUser.email) || false;
        
        console.log('[REACTIONS] Estado atual:', { 
          existingReaction, 
          userAlreadyReacted,
          currentReactions: message.reactions,
          userEmail: currentUser.email
        });
        
        if (userAlreadyReacted) {
          // Se já reagiu, remover (toggle)
          console.log('[REACTIONS] Usuário já reagiu, removendo reação');
        } else {
          // Se não reagiu, adicionar
          console.log('[REACTIONS] Usuário ainda não reagiu, adicionando reação');
        }
      }
      
      this.http.post(`http://localhost:8080/api/chat/message/${messageId}/reaction`, { emoji })
        .subscribe({
          next: (response: any) => {
            console.log('[REACTIONS] Resposta do backend:', response);
            // Atualizar reações na mensagem local
            const message = this.messages.find(m => m.id === messageId);
            if (message) {
              console.log('[REACTIONS] Reações antes da atualização:', message.reactions);
              message.reactions = response.reactions;
              console.log('[REACTIONS] Reações após atualização:', message.reactions);
              this.cdr.markForCheck();
            } else {
              console.warn('[REACTIONS] Mensagem não encontrada para atualizar:', messageId);
            }
          },
          error: (error) => {
            console.error('[REACTIONS] Erro ao adicionar reação:', error);
            console.error('[REACTIONS] Detalhes do erro:', {
              status: error.status,
              message: error.message,
              error: error.error
            });
          }
        });
    });
  }
  
  showReactionPickerForMessage(messageId: string, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevenir que o clique propague para o document
    }
    
    if (this.emojiPickerTimer) {
      clearTimeout(this.emojiPickerTimer);
      this.emojiPickerTimer = null;
    }
    
    // Toggle: se já está aberto para esta mensagem, fecha; caso contrário, abre
    this.showReactionPicker = this.showReactionPicker === messageId ? null : messageId;
    this.cdr.markForCheck();
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Usar setTimeout para garantir que o evento do botão seja processado primeiro
    setTimeout(() => {
      // Verificar se o clique foi fora do picker e fora do botão de reação
      const target = event.target as HTMLElement;
      
      // Se não há picker aberto, não fazer nada
      if (!this.showReactionPicker) {
        return;
      }
      
      // Verificar se o clique foi dentro do picker
      const pickerElement = target.closest('.emoji-picker');
      if (pickerElement) {
        return; // Não fechar se o clique foi dentro do picker
      }
      
      // Verificar se o clique foi no botão de reação (para toggle)
      const reactionButton = target.closest('.reaction-button');
      if (reactionButton) {
        // O método showReactionPickerForMessage já lidou com o toggle
        return;
      }
      
      // Se chegou aqui, o clique foi fora do picker e fora do botão, então fechar
      this.showReactionPicker = null;
      this.cdr.markForCheck();
    }, 0);
  }
  
  keepEmojiPickerOpen(messageId: string): void {
    if (this.emojiPickerTimer) {
      clearTimeout(this.emojiPickerTimer);
      this.emojiPickerTimer = null;
    }
    // Manter o picker aberto enquanto o mouse estiver sobre ele
    this.showReactionPicker = messageId;
  }
  
  closeEmojiPickerDelayed(): void {
    // Aumentar o delay para 800ms para dar tempo de mover o mouse
    if (this.emojiPickerTimer) {
      clearTimeout(this.emojiPickerTimer);
    }
    this.emojiPickerTimer = setTimeout(() => {
      // Verificar se o mouse ainda não está sobre o picker
      const pickerElement = document.querySelector('.emoji-picker') as HTMLElement;
      if (pickerElement && !pickerElement.matches(':hover')) {
        this.showReactionPicker = null;
        this.cdr.markForCheck();
      }
    }, 800);
  }
  
  closeEmojiPicker(): void {
    if (this.emojiPickerTimer) {
      clearTimeout(this.emojiPickerTimer);
      this.emojiPickerTimer = null;
    }
    this.showReactionPicker = null;
    this.cdr.markForCheck();
  }
  
  getAvailableEmojis(): string[] {
    return [
      '👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥',
      '✅', '❌', '⭐', '💯', '🎉', '🎊', '🎈', '🎁',
      '😍', '🤔', '😎', '😴', '😭', '😡', '🤢', '🤮',
      '😱', '😰', '😨', '😤', '😠', '😋', '🤤', '😇',
      '🤗', '🤝', '🙌', '👌', '✌️', '🤞', '🤘', '👏',
      '💪', '🤳', '🙏', '💯', '🔥', '⭐', '✨', '💫',
      '💥', '💢', '💤', '💨', '💦', '💧', '🌊', '🎯',
      '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
      '🎸', '🎺', '🎷', '🥁', '🎻', '🎲', '🎮', '🕹️'
    ];
  }
  
  // Upload de arquivos
  onFileSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    if (!files || files.length === 0) return;
    
    files.forEach(file => {
      // Verificar tipo
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      
      if (!isImage && !isAudio) {
        alert(`${file.name}: Apenas imagens e áudios são permitidos`);
        return;
      }
      
      // Verificar tamanho (2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        alert(`${file.name}: Arquivo muito grande. Tamanho máximo: 2GB`);
        return;
      }
      
      if (isImage) {
        // Adicionar à lista de imagens
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.filePreviews.push({ file, preview: e.target.result });
          this.selectedFiles.push(file);
          this.cdr.markForCheck();
        };
        reader.readAsDataURL(file);
      } else if (isAudio) {
        // Para áudio, usar apenas um arquivo (compatibilidade)
        this.selectedFile = file;
      }
    });
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  }
  
  removeImagePreview(index: number): void {
    this.filePreviews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
    this.cdr.markForCheck();
  }
  
  addMoreImages(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  
  uploadFile(): void {
    // Parar indicador de digitação
    this.stopTyping();
    
    // Upload de múltiplas imagens
    if (this.selectedFiles.length > 0) {
      this.uploadMultipleImages();
      return;
    }
    
    // Upload de arquivo único (áudio)
    if (!this.selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    
    this.uploadSingleFile(formData, (response: any) => {
      const messageContent = this.newMessage.trim() || (this.selectedFile?.name || '');
      this.sendFileMessage(response, messageContent);
      
      // Limpar arquivo após envio
      this.selectedFile = null;
      this.newMessage = '';
      this.replyingTo = null;
      this.cdr.markForCheck();
    });
  }
  
  uploadMultipleImages(): void {
    if (this.selectedFiles.length === 0) return;
    
    let uploadedCount = 0;
    const totalFiles = this.selectedFiles.length;
    
    this.selectedFiles.forEach((file, index) => {
      const formData = new FormData();
      formData.append('file', file);
      
      this.uploadSingleFile(formData, (response: any) => {
        uploadedCount++;
        const messageContent = index === 0 ? this.newMessage.trim() : '';
        this.sendFileMessage(response, messageContent);
        
        if (uploadedCount === totalFiles) {
          // Limpar após todos os uploads
          this.selectedFiles = [];
          this.filePreviews = [];
          this.newMessage = '';
          this.replyingTo = null;
          this.cdr.markForCheck();
        }
      });
    });
  }
  
  uploadSingleFile(formData: FormData, callback: (response: any) => void): void {
    this.http.post('http://localhost:8080/api/chat/upload', formData)
      .subscribe({
        next: (response: any) => {
          callback(response);
        },
        error: (error) => {
          console.error('Erro ao fazer upload:', error);
          alert('Erro ao fazer upload do arquivo');
        }
      });
  }
  
  sendFileMessage(response: any, messageContent: string): void {
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user || !this.stompClient || !this.connected) return;
      
      const messageId = this.generateMessageId();
      
      const chatMessage: any = {
        type: response.messageType,
        content: messageContent || response.fileName || '',
        sender: user.email,
        senderName: user.name || user.email,
        senderRole: user.role,
        classroomId: this.classroomId,
        id: messageId,
        fileUrl: response.fileUrl,
        fileType: response.fileType,
        fileName: response.fileName,
        fileSize: response.fileSize,
        repliedToMessageId: this.replyingTo?.id,
        spectrogram: response.spectrogram || undefined
      };
      
      // Enviar via WebSocket em tempo real
      if (this.isRoomChat && this.classroomId) {
        this.stompClient.publish({
          destination: '/app/chat.sendMessage.room',
          body: JSON.stringify(chatMessage)
        });
      } else {
        this.stompClient.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(chatMessage)
        });
      }
    });
  }
  
  cancelFileUpload(): void {
    this.selectedFile = null;
    this.selectedFiles = [];
    this.filePreviews = [];
    this.cdr.markForCheck();
  }
  
  // Gravação de áudio
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordingStream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      // Configurar análise de áudio para espectrograma
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      
      // Inicializar canvas para espectrograma
      setTimeout(() => {
        this.initSpectrogramCanvas();
        if (this.canvasElement) {
          this.drawSpectrogram();
        }
      }, 100);
      
      this.mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      this.mediaRecorder.onstop = () => {
        // Parar a visualização
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        
        // Salvar espectrograma final
        if (this.canvasElement) {
          this.recordedAudioSpectrogram = this.canvasElement.toDataURL('image/png');
        }
        
        // Só criar o áudio se houver chunks (não foi cancelado)
        if (chunks.length > 0) {
          this.recordedAudio = new Blob(chunks, { type: 'audio/webm' });
        }
        
        // Parar o stream se ainda estiver ativo
        if (this.recordingStream) {
          this.recordingStream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
          this.recordingStream = null;
        }
        
        // Limpar contexto de áudio
        if (this.audioContext) {
          this.audioContext.close().catch(() => {});
          this.audioContext = null;
        }
        this.analyser = null;
        
        this.isRecording = false;
        this.recordingTime = 0;
        this.cdr.markForCheck();
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingTime = 0;
      
      // Timer para duração
      const timer = setInterval(() => {
        if (this.isRecording) {
          this.recordingTime++;
          this.cdr.markForCheck();
        } else {
          clearInterval(timer);
        }
      }, 1000);
      
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao acessar o microfone');
    }
  }
  
  initSpectrogramCanvas(): void {
    // Limpar canvas anterior se existir
    const existingCanvas = document.getElementById('recordingSpectrogram');
    if (existingCanvas) {
      existingCanvas.remove();
    }
    
    // Criar novo canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'recordingSpectrogram';
    
    // Obter largura do container
    const recordingIndicator = document.querySelector('.recording-indicator-container');
    const containerWidth = recordingIndicator?.clientWidth || 300;
    
    // Ajustar tamanho do canvas baseado na largura da tela
    const isMobile = window.innerWidth <= 640;
    canvas.width = isMobile ? Math.min(containerWidth, 300) : 300;
    canvas.height = isMobile ? 60 : 80;
    
    canvas.style.width = '100%';
    canvas.style.height = isMobile ? '60px' : '80px';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '0.5rem';
    canvas.style.maxWidth = '100%';
    
    if (recordingIndicator) {
      recordingIndicator.appendChild(canvas);
      this.canvasElement = canvas;
      this.canvasContext = canvas.getContext('2d');
      
      // Configurar contexto do canvas com gradiente
      if (this.canvasContext) {
        const gradient = this.canvasContext.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgb(30, 41, 59)'); // slate-800
        gradient.addColorStop(1, 'rgb(15, 23, 42)'); // slate-900
        this.canvasContext.fillStyle = gradient;
        this.canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Se não encontrar o container, tentar novamente após um pequeno delay
      setTimeout(() => {
        this.initSpectrogramCanvas();
      }, 100);
    }
  }
  
  drawSpectrogram(): void {
    if (!this.analyser || !this.canvasContext || !this.canvasElement || !this.isRecording) {
      return;
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!this.analyser || !this.canvasContext || !this.canvasElement || !this.isRecording) {
        return;
      }
      
      this.analyser.getByteFrequencyData(dataArray);
      
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      
      // Limpar canvas com gradiente de fundo
      const gradient = this.canvasContext.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgb(30, 41, 59)'); // slate-800
      gradient.addColorStop(1, 'rgb(15, 23, 42)'); // slate-900
      this.canvasContext.fillStyle = gradient;
      this.canvasContext.fillRect(0, 0, width, height);
      
      const barWidth = width / bufferLength * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;
        
        // Cores vibrantes do espectrograma (gradiente azul-roxo)
        const intensity = dataArray[i] / 255;
        const r = Math.floor(99 + (156 * intensity)); // 99-255 (azul para branco)
        const g = Math.floor(102 + (153 * intensity)); // 102-255
        const b = Math.floor(241 + (14 * intensity)); // 241-255
        
        // Criar gradiente vertical para cada barra
        const barGradient = this.canvasContext.createLinearGradient(x, height - barHeight, x, height);
        barGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
        barGradient.addColorStop(0.5, `rgb(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)})`);
        barGradient.addColorStop(1, `rgb(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)})`);
        
        this.canvasContext.fillStyle = barGradient;
        this.canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      this.animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
  }
  
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      // O stream será parado no onstop callback do MediaRecorder
    }
  }
  
  cancelRecording(): void {
    // Parar a visualização
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Se estiver gravando, parar a gravação
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    // Parar o stream de áudio se estiver ativo
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach(track => track.stop());
      this.recordingStream = null;
    }
    
    // Limpar contexto de áudio
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    
    // Limpar canvas
    const canvas = document.getElementById('recordingSpectrogram');
    if (canvas) {
      canvas.remove();
    }
    this.canvasElement = null;
    this.canvasContext = null;
    
    // Limpar tudo relacionado ao áudio
    this.mediaRecorder = null;
    this.isRecording = false;
    this.recordedAudio = null;
    this.recordedAudioSpectrogram = null;
    this.recordingTime = 0;
    this.cdr.markForCheck();
  }
  
  async sendRecordedAudio(): Promise<void> {
    if (!this.recordedAudio) return;
    
    // Parar indicador de digitação
    this.stopTyping();
    
    // Converter blob para File
    const audioFile = new File([this.recordedAudio], 'recording.webm', { type: 'audio/webm' });
    this.selectedFile = audioFile;
    
    const formData = new FormData();
    formData.append('file', audioFile);
    
    // Salvar espectrograma temporariamente
    const spectrogramData = this.recordedAudioSpectrogram;
    
    this.uploadSingleFile(formData, (response: any) => {
      // Incluir espectrograma na mensagem
      response.spectrogram = spectrogramData;
      this.sendFileMessage(response, 'Áudio');
      
      // Limpar áudio após envio
      this.recordedAudio = null;
      this.recordedAudioSpectrogram = null;
      this.selectedFile = null;
      
      // Limpar canvas
      const canvas = document.getElementById('recordingSpectrogram');
      if (canvas) {
        canvas.remove();
      }
      this.canvasElement = null;
      this.canvasContext = null;
      
      this.cdr.markForCheck();
    });
  }
  
  // Sistema de digitação
  onTyping(): void {
    if (!this.stompClient || !this.connected) return;
    
    // Limpar timer anterior
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) return;
      
      // Enviar evento de digitação
      this.stompClient!.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({
          sender: user.email,
          senderName: user.name || user.email,
          classroomId: this.classroomId
        })
      });
    });
    
    // Parar de digitar após 2 segundos sem digitação
    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }
  
  stopTyping(): void {
    if (!this.stompClient || !this.connected) return;
    
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    this.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) return;
      
      this.stompClient!.publish({
        destination: '/app/chat.stopTyping',
        body: JSON.stringify({
          sender: user.email,
          classroomId: this.classroomId
        })
      });
    });
  }
  
  formatRecordingTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  scrollToMessage(messageId: string | undefined): void {
    if (!messageId) return;
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  getAudioUrl(): string {
    if (!this.recordedAudio) return '';
    return URL.createObjectURL(this.recordedAudio);
  }

  toggleAudioPlayback(messageId: string, audioUrl: string): void {
    const audioElement = document.getElementById(`audio-${messageId}`) as HTMLAudioElement;
    if (!audioElement) return;

    const isCurrentlyPlaying = this.getAudioPlayingState(messageId);
    
    if (isCurrentlyPlaying) {
      audioElement.pause();
      this.setAudioPlayingState(messageId, false);
    } else {
      // Pausar todos os outros áudios
      this.audioPlayingStates.forEach((isPlaying: boolean, id: string) => {
        if (isPlaying) {
          const otherAudioElement = document.getElementById(`audio-${id}`) as HTMLAudioElement;
          if (otherAudioElement) {
            otherAudioElement.pause();
          }
          this.setAudioPlayingState(id, false);
        }
      });
      audioElement.play().catch(e => console.error("Erro ao tentar tocar áudio:", e));
      this.setAudioPlayingState(messageId, true);
    }
  }

  getAudioPlayingState(messageId: string): boolean {
    return this.audioPlayingStates.get(messageId) || false;
  }

  setAudioPlayingState(messageId: string, isPlaying: boolean): void {
    this.audioPlayingStates.set(messageId, isPlaying);
    this.cdr.markForCheck();
  }
  
  openImageInNewTab(fileUrl: string | undefined): void {
    if (!fileUrl) return;
    window.open('http://localhost:8080' + fileUrl, '_blank');
  }
}