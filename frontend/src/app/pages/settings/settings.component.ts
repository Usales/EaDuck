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
  
  // Form data for teachers
  teacherForm = {
    nomeCompleto: '',
    cpf: '',
    endereco: '',
    titulacao: '',
    titulacoes: [] as string[]
  };
  
  // Form data for admins
  adminForm = {
    nomeCompleto: '',
    cpf: '',
    endereco: ''
  };
  
  // Form data for students
  studentForm = {
    name: '',
    nomeCompleto: '',
    cpf: '',
    dataNascimento: '',
    nomeMae: '',
    nomePai: '',
    telefone: '',
    endereco: ''
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
  isUpdatingTeacherData = false;
  isUpdatingAdminData = false;
  isUpdatingStudentData = false;
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // Theme
  currentTheme: 'light' | 'dark' | 'auto' = 'auto';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private themeService: ThemeService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    // Carregar tema atual
    this.currentTheme = this.themeService.getCurrentTheme();
    
    // Observar mudanças de tema
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
    
    this.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.nameForm.name = user.name || '';
        // Carregar dados do professor se for TEACHER
        if (user.role === 'TEACHER') {
          this.teacherForm.nomeCompleto = user.nomeCompleto || '';
          this.teacherForm.cpf = user.cpf || '';
          this.teacherForm.endereco = user.endereco || '';
          if (user.titulacao) {
            this.teacherForm.titulacoes = user.titulacao.split(';').map(t => t.trim()).filter(t => t);
          }
        }
        // Carregar dados do admin se for ADMIN
        if (user.role === 'ADMIN') {
          this.adminForm.nomeCompleto = user.nomeCompleto || '';
          this.adminForm.cpf = user.cpf || '';
          this.adminForm.endereco = user.endereco || '';
        }
        // Carregar dados do estudante se for STUDENT
        if (user.role === 'STUDENT') {
          this.studentForm.name = user.name || '';
          this.studentForm.nomeCompleto = user.nomeCompleto || '';
          this.studentForm.cpf = user.cpf || '';
          this.studentForm.dataNascimento = user.dataNascimento || '';
          this.studentForm.nomeMae = user.nomeMae || '';
          this.studentForm.nomePai = user.nomePai || '';
          this.studentForm.telefone = user.telefone || '';
          this.studentForm.endereco = user.endereco || '';
        }
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
  
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (this.currentTheme !== theme) {
      this.themeService.setTheme(theme);
      this.currentTheme = theme;
    }
  }

  get isTeacher(): boolean {
    return this.currentUser?.role === 'TEACHER';
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  get isStudent(): boolean {
    return this.currentUser?.role === 'STUDENT';
  }

  formatCPF(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      this.teacherForm.cpf = value;
    }
  }

  addTitulacao() {
    const titulacaoTrimmed = this.teacherForm.titulacao?.trim() || '';
    
    if (!titulacaoTrimmed) {
      this.errorMessage = 'Por favor, digite uma titulação antes de adicionar';
      this.clearMessages();
      return;
    }
    
    if (this.teacherForm.titulacoes.includes(titulacaoTrimmed)) {
      this.errorMessage = 'Esta titulação já foi adicionada';
      this.clearMessages();
      return;
    }
    
    this.teacherForm.titulacoes = [...this.teacherForm.titulacoes, titulacaoTrimmed];
    this.teacherForm.titulacao = '';
  }

  removeTitulacao(index: number) {
    this.teacherForm.titulacoes.splice(index, 1);
  }

  updateTeacherData(): void {
    if (!this.teacherForm.nomeCompleto.trim()) {
      this.errorMessage = 'Nome completo é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.teacherForm.cpf.trim()) {
      this.errorMessage = 'CPF é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.teacherForm.endereco.trim()) {
      this.errorMessage = 'Endereço é obrigatório';
      this.clearMessages();
      return;
    }
    if (this.teacherForm.titulacoes.length === 0) {
      this.errorMessage = 'Adicione pelo menos uma titulação';
      this.clearMessages();
      return;
    }

    this.isUpdatingTeacherData = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      nomeCompleto: this.teacherForm.nomeCompleto.trim(),
      cpf: this.teacherForm.cpf.trim(),
      endereco: this.teacherForm.endereco.trim(),
      titulacao: this.teacherForm.titulacoes.join('; ')
    };

    this.authService.updateUserData(updateData).subscribe({
      next: (response: any) => {
        this.isUpdatingTeacherData = false;
        this.successMessage = 'Dados atualizados com sucesso!';
        
        // Atualizar usuário atual
        if (this.currentUser) {
          this.currentUser.nomeCompleto = this.teacherForm.nomeCompleto.trim();
          this.currentUser.cpf = this.teacherForm.cpf.trim();
          this.currentUser.endereco = this.teacherForm.endereco.trim();
          this.currentUser.titulacao = updateData.titulacao;
          this.authService.updateCurrentUser(this.currentUser);
        }
        
        // Salvar em cache
        localStorage.setItem('teacherDataFilled', 'true');
        
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingTeacherData = false;
        this.errorMessage = error.error?.error || 'Erro ao atualizar dados';
        this.clearMessages();
      }
    });
  }

  formatCPFAdmin(event: any) {
    // Reutilizar o mesmo método de formatação
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      this.adminForm.cpf = value;
    }
  }

  updateAdminData(): void {
    if (!this.adminForm.nomeCompleto.trim()) {
      this.errorMessage = 'Nome completo é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.adminForm.cpf.trim()) {
      this.errorMessage = 'CPF é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.adminForm.endereco.trim()) {
      this.errorMessage = 'Endereço é obrigatório';
      this.clearMessages();
      return;
    }

    this.isUpdatingAdminData = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      nomeCompleto: this.adminForm.nomeCompleto.trim(),
      cpf: this.adminForm.cpf.trim(),
      endereco: this.adminForm.endereco.trim()
    };

    this.authService.updateUserData(updateData).subscribe({
      next: (response: any) => {
        this.isUpdatingAdminData = false;
        this.successMessage = 'Dados atualizados com sucesso!';
        
        // Atualizar usuário atual
        if (this.currentUser) {
          this.currentUser.nomeCompleto = this.adminForm.nomeCompleto.trim();
          this.currentUser.cpf = this.adminForm.cpf.trim();
          this.currentUser.endereco = this.adminForm.endereco.trim();
          this.authService.updateCurrentUser(this.currentUser);
        }
        
        // Salvar em cache
        localStorage.setItem('adminDataFilled', 'true');
        
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingAdminData = false;
        this.errorMessage = error.error?.error || 'Erro ao atualizar dados';
        this.clearMessages();
      }
    });
  }

  formatDate(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '-' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '-' + value.substring(5, 9);
    }
    this.studentForm.dataNascimento = value;
  }

  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
      }
      this.studentForm.telefone = value;
    }
  }

  formatCPFStudent(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      this.studentForm.cpf = value;
    }
  }

  updateStudentData(): void {
    if (!this.studentForm.name.trim()) {
      this.errorMessage = 'Apelido/Nickname é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.nomeCompleto.trim()) {
      this.errorMessage = 'Nome completo é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.cpf.trim()) {
      this.errorMessage = 'CPF é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.dataNascimento.trim() || this.studentForm.dataNascimento.length !== 10) {
      this.errorMessage = 'Data de nascimento é obrigatória (formato dd-mm-aaaa)';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.nomeMae.trim()) {
      this.errorMessage = 'Nome da mãe é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.nomePai.trim()) {
      this.errorMessage = 'Nome do pai é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.telefone.trim()) {
      this.errorMessage = 'Telefone de contato é obrigatório';
      this.clearMessages();
      return;
    }
    if (!this.studentForm.endereco.trim()) {
      this.errorMessage = 'Endereço é obrigatório';
      this.clearMessages();
      return;
    }

    this.isUpdatingStudentData = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      name: this.studentForm.name.trim(),
      nomeCompleto: this.studentForm.nomeCompleto.trim(),
      cpf: this.studentForm.cpf.trim(),
      dataNascimento: this.studentForm.dataNascimento.trim(),
      nomeMae: this.studentForm.nomeMae.trim(),
      nomePai: this.studentForm.nomePai.trim(),
      telefone: this.studentForm.telefone.trim(),
      endereco: this.studentForm.endereco.trim()
    };

    this.authService.updateUserData(updateData).subscribe({
      next: (response: any) => {
        this.isUpdatingStudentData = false;
        this.successMessage = 'Dados atualizados com sucesso!';
        
        // Atualizar usuário atual
        if (this.currentUser) {
          this.currentUser.name = this.studentForm.name.trim();
          this.currentUser.nomeCompleto = this.studentForm.nomeCompleto.trim();
          this.currentUser.cpf = this.studentForm.cpf.trim();
          this.currentUser.dataNascimento = this.studentForm.dataNascimento.trim();
          this.currentUser.nomeMae = this.studentForm.nomeMae.trim();
          this.currentUser.nomePai = this.studentForm.nomePai.trim();
          this.currentUser.telefone = this.studentForm.telefone.trim();
          this.currentUser.endereco = this.studentForm.endereco.trim();
          this.authService.updateCurrentUser(this.currentUser);
        }
        
        // Salvar em cache
        localStorage.setItem('studentDataFilled', 'true');
        
        this.clearMessages();
      },
      error: (error) => {
        this.isUpdatingStudentData = false;
        this.errorMessage = error.error?.error || 'Erro ao atualizar dados';
        this.clearMessages();
      }
    });
  }
}