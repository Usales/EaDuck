import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';
import { ThemeService } from '../../services/theme.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  currentUser$: Observable<User | null>;
  currentUser: User | null = null;
  
  // Form data
  nameForm = {
    name: ''
  };
  
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  notificationSettings = {
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    messageNotifications: true
  };
  
  // Form states
  isUpdatingName = false;
  isUpdatingPassword = false;
  isUpdatingNotifications = false;
  
  // Messages
  successMessage = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.nameForm.name = user.name || '';
        this.loadNotificationSettings();
      }
    });
  }

  private loadNotificationSettings(): void {
    // Por enquanto, carregar configurações padrão
    // Futuramente, pode ser implementado um endpoint para buscar configurações do usuário
    this.notificationSettings = {
      emailNotifications: true,
      pushNotifications: true,
      taskReminders: true,
      messageNotifications: true
    };
  }

  updateName(): void {
    if (!this.nameForm.name.trim()) {
      this.errorMessage = 'Nome é obrigatório';
      return;
    }

    this.isUpdatingName = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      name: this.nameForm.name.trim()
    };

    this.http.put('http://localhost:8080/api/users/profile', updateData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        this.isUpdatingName = false;
        this.successMessage = 'Nome atualizado com sucesso!';
        // Atualizar usuário atual
        if (this.currentUser) {
          this.currentUser.name = this.nameForm.name.trim();
          this.authService.updateCurrentUser(this.currentUser);
        }
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingName = false;
        this.errorMessage = error.error?.message || 'Erro ao atualizar nome';
        this.clearMessages();
      }
    });
  }

  updatePassword(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.errorMessage = 'Todos os campos de senha são obrigatórios';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMessage = 'Nova senha e confirmação não coincidem';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.errorMessage = 'Nova senha deve ter pelo menos 6 caracteres';
      return;
    }

    this.isUpdatingPassword = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.http.put('http://localhost:8080/api/users/change-password', updateData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        this.isUpdatingPassword = false;
        this.successMessage = 'Senha atualizada com sucesso!';
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingPassword = false;
        this.errorMessage = error.error?.message || 'Erro ao atualizar senha';
        this.clearMessages();
      }
    });
  }

  updateNotifications(): void {
    this.isUpdatingNotifications = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.put('http://localhost:8080/api/users/notification-settings', this.notificationSettings, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (response: any) => {
        this.isUpdatingNotifications = false;
        this.successMessage = 'Configurações de notificação atualizadas!';
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingNotifications = false;
        this.errorMessage = error.error?.message || 'Erro ao atualizar configurações';
        this.clearMessages();
      }
    });
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 5000);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
}