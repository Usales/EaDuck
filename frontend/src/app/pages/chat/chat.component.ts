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
  files?: File[];
}

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  lastSeen: Date;
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

  // New properties for enhanced features
  sidebarOpen: boolean = false;
  showEmojiPicker: boolean = false;
  selectedFiles: File[] = [];
  onlineUsers: number = 0;
  onlineUsersList: OnlineUser[] = [];
  
  // Theme properties
  currentTheme: Theme = 'auto';
  isDarkMode: boolean = false;
  
  // Emoji list
  emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  constructor(
    private authService: AuthService,
    private themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.connect();
    this.initializeTheme();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscription.unsubscribe();
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

  // New methods for enhanced features
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  toggleSettings(): void {
    // TODO: Implement settings modal
    console.log('Settings clicked');
  }

  // Theme management methods
  initializeTheme(): void {
    this.subscription.add(
      this.themeService.theme$.subscribe(theme => {
        this.currentTheme = theme;
        this.isDarkMode = this.themeService.isDarkMode();
      })
    );
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
      default:
        return '🔄';
    }
  }

  getThemeLabel(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Escuro';
      case 'auto':
      default:
        return 'Automático';
    }
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (this.validateFile(file)) {
          this.selectedFiles.push(file);
        }
      }
    }
  }

  validateFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (file.size > maxSize) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de arquivo não permitido');
      return false;
    }

    return true;
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  clearMessage(): void {
    this.newMessage = '';
    this.selectedFiles = [];
    this.showEmojiPicker = false;
  }

  copyMessage(message: string): void {
    navigator.clipboard.writeText(message).then(() => {
      // Show toast notification
      this.showToast('Mensagem copiada!');
    });
  }

  deleteMessage(index: number): void {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      this.messages.splice(index, 1);
      this.showToast('Mensagem excluída!');
    }
  }

  showToast(message: string): void {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  // Enhanced sendMessage method
  sendMessage(): void {
    if ((!this.newMessage.trim() && this.selectedFiles.length === 0) || !this.stompClient || !this.connected) {
      return;
    }

    const chatMessage = {
      sender: '',
      content: this.newMessage,
      type: 'CHAT',
      files: this.selectedFiles
    };

    this.subscription.add(
      this.currentUser$.subscribe(user => {
        if (user) {
          chatMessage.sender = user.email;
          
          // Send message via WebSocket
          this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
          
          // Upload files if any
          if (this.selectedFiles.length > 0) {
            this.uploadFiles(this.selectedFiles, user.email);
          }
          
          // Clear inputs
          this.newMessage = '';
          this.selectedFiles = [];
          this.showEmojiPicker = false;
        }
      })
    );
  }

  uploadFiles(files: File[], sender: string): void {
    files.forEach(file => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sender', sender);
      
      // Upload file to backend
      fetch('http://localhost:8080/api/files/upload', {
        method: 'POST',
        body: formData
      }).then(response => {
        if (response.ok) {
          this.showToast(`Arquivo ${file.name} enviado com sucesso!`);
        } else {
          this.showToast(`Erro ao enviar arquivo ${file.name}`);
        }
      }).catch(error => {
        console.error('Error uploading file:', error);
        this.showToast(`Erro ao enviar arquivo ${file.name}`);
      });
    });
  }

  // Enhanced connect method with user tracking
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

      // Subscribe to user count updates
      this.stompClient.subscribe('/topic/userCount', (message: any) => {
        const data = JSON.parse(message.body);
        this.onlineUsers = data.count;
        this.onlineUsersList = data.users;
      });

      // Send join message
      this.subscription.add(
        this.currentUser$.subscribe(user => {
          if (user && this.stompClient && this.connected) {
            this.stompClient.send('/app/chat.addUser', {}, JSON.stringify({
              sender: user.email,
              senderName: user.name || user.email,
              type: 'JOIN'
            }));
          }
        })
      );
    }, (error: any) => {
      console.log('Error: ' + error);
      this.connected = false;
      setTimeout(() => {
        this.connect();
      }, 5000);
    });
  }

  // Enhanced disconnect method
  disconnect(): void {
    if (this.stompClient !== null) {
      // Send leave message
      this.subscription.add(
        this.currentUser$.subscribe(user => {
          if (user) {
            this.stompClient.send('/app/chat.addUser', {}, JSON.stringify({
              sender: user.email,
              senderName: user.name || user.email,
              type: 'LEAVE'
            }));
          }
        })
      );
      
      this.stompClient.disconnect();
    }
    this.connected = false;
    console.log('Disconnected');
  }
}
