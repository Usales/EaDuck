import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { UserService, User, CreateUserRequest } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, ModalComponent, HttpClientModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  filter = '';
  filterRole: string = 'all'; // 'all', 'ADMIN', 'STUDENT', 'TEACHER'
  filterStatus: string = 'all'; // 'all', 'active', 'inactive'
  editUserId: number | null = null;
  editRole: string = '';
  editIsActive: boolean = false;

  // Campos para novo usuário
  showNewUserForm = false;
  newUser: CreateUserRequest = {
    email: '',
    password: '',
    role: 'STUDENT'
  };

  // Modal
  showModal = false;
  modalTitle = '';
  modalMessage = '';
  modalType: 'success' | 'error' | 'info' | 'warning' = 'info';

  // Modal de confirmação para exclusão
  showConfirmModal = false;
  confirmModalTitle = '';
  confirmModalMessage = '';
  userToDelete: User | null = null;

  currentUser: User | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (this.isAdmin) {
        this.loadUsers();
      }
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: users => {
        this.users = users.map(u => ({
          ...u,
          isActive: u.isActive !== undefined ? u.isActive : ((u as any).active !== undefined ? (u as any).active : false)
        }));
        this.applyFilter();
        // Força a detecção de mudanças após atualizar a lista
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 403) {
          // Não faz nada, apenas ignora para não quebrar a tela
        }
      }
    });
  }

  applyFilter() {
    const f = this.filter.toLowerCase();
    this.filteredUsers = this.users.filter(u => {
      // Filtro de busca por texto (email)
      const matchesSearch = f === '' || u.email.toLowerCase().includes(f);
      
      // Filtro por tipo/role
      const matchesRole = this.filterRole === 'all' || u.role === this.filterRole;
      
      // Filtro por status
      let matchesStatus = true;
      if (this.filterStatus === 'active') {
        matchesStatus = u.isActive === true;
      } else if (this.filterStatus === 'inactive') {
        matchesStatus = u.isActive === false;
      }
      
      return matchesSearch && matchesRole && matchesStatus;
    });
    this.cdr.detectChanges();
  }

  // Método para traduzir o role para português
  getRoleLabel(role: string): string {
    switch (role) {
      case 'STUDENT':
        return 'Estudante';
      case 'TEACHER':
        return 'Professor';
      case 'ADMIN':
        return 'Admin';
      default:
        return role;
    }
  }

  // Limpar todos os filtros
  clearFilters() {
    this.filter = '';
    this.filterRole = 'all';
    this.filterStatus = 'all';
    this.applyFilter();
  }

  startEdit(user: User) {
    if (!this.canEditUser(user)) {
      return;
    }
    this.editUserId = user.id;
    this.editRole = user.role;
    this.editIsActive = user.isActive;
  }

  cancelEdit() {
    this.editUserId = null;
  }

  saveEdit(user: User) {
    if (!this.canEditUser(user)) {
      return;
    }

    if (!this.editRole) {
      this.showErrorModal('Erro', 'Por favor, selecione um papel para o usuário.', 'warning');
      return;
    }

    // Atualiza o papel do usuário
    this.userService.updateUserRole(user.id, this.editRole).subscribe({
      next: (updated) => {
        user.role = updated.role;
        // Atualiza o status do usuário
        const isActive = Boolean(this.editIsActive); // Garante que é um booleano
        this.userService.updateUserStatus(user.id, isActive).subscribe({
          next: (statusUpdated) => {
            user.isActive = statusUpdated.isActive;
            this.editUserId = null;
            // Recarrega a lista de usuários para garantir que está atualizada
            this.loadUsers();
            this.showErrorModal(
              'Sucesso',
              'Usuário atualizado com sucesso!',
              'success'
            );
          },
          error: (error) => {
            this.showErrorModal(
              'Erro',
              'Erro ao atualizar status do usuário: ' + (error.error?.message || 'Erro desconhecido'),
              'error'
            );
          }
        });
      },
      error: (error) => {
        this.showErrorModal(
          'Erro',
          'Erro ao atualizar papel do usuário: ' + (error.error?.message || 'Erro desconhecido'),
          'error'
        );
      }
    });
  }

  canEditUser(user: User): boolean {
    const currentUser = this.currentUser;
    if (!currentUser) return false;
    if (currentUser.id === 1) {
      return user.id !== 1;
    }
    if (currentUser.role === 'ADMIN') {
      return user.role !== 'ADMIN' && currentUser.id !== user.id;
    }
    return false;
  }

  toggleNewUserForm() {
    this.showNewUserForm = !this.showNewUserForm;
    if (!this.showNewUserForm) {
      this.resetNewUserForm();
    }
  }

  resetNewUserForm() {
    this.newUser = {
      email: '',
      password: '',
      role: 'STUDENT'
    };
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    return password.length >= 6;
  }

  showErrorModal(title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') {
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalType = type;
    this.showModal = true;
  }

  createUser() {
    if (!this.newUser.email || !this.newUser.password) {
      this.showErrorModal(
        'Campos Obrigatórios',
        'Por favor, preencha todos os campos obrigatórios.',
        'warning'
      );
      return;
    }

    if (!this.validateEmail(this.newUser.email)) {
      this.showErrorModal(
        'E-mail Inválido',
        'Por favor, insira um endereço de e-mail válido.',
        'warning'
      );
      return;
    }

    if (!this.validatePassword(this.newUser.password)) {
      this.showErrorModal(
        'Senha Inválida',
        'A senha deve ter pelo menos 6 caracteres.',
        'warning'
      );
      return;
    }

    this.userService.createUser(this.newUser).subscribe({
      next: (createdUser) => {
        // Recarrega a lista completa de usuários para garantir que está atualizada
        this.loadUsers();
        this.showNewUserForm = false;
        this.resetNewUserForm();
        this.showErrorModal(
          'Sucesso',
          'Usuário criado com sucesso!',
          'success'
        );
        // Força a detecção de mudanças
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.showErrorModal(
          'Erro ao Criar Usuário',
          error.error?.message || 'Ocorreu um erro ao criar o usuário. Por favor, tente novamente.',
          'error'
        );
      }
    });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  // Termômetro de senha
  get passwordStrength(): number {
    const password = this.newUser.password || '';
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s <= 1) return 'Fraca';
    if (s === 2) return 'Média';
    if (s === 3 || s === 4) return 'Forte';
    return 'Excelente';
  }

  deleteUser(user: User) {
    if (!this.canEditUser(user)) {
      this.showErrorModal(
        'Ação Não Permitida',
        'Você não pode deletar este usuário.',
        'warning'
      );
      return;
    }

    // Mostrar modal de confirmação
    this.userToDelete = user;
    this.confirmModalTitle = 'Confirmar Exclusão';
    this.confirmModalMessage = `Tem certeza que deseja deletar o usuário <strong>${user.email}</strong>?<br><br>Esta ação não pode ser desfeita.`;
    this.showConfirmModal = true;
  }

  confirmDelete() {
    if (!this.userToDelete) return;

    const userId = this.userToDelete.id;
    const userEmail = this.userToDelete.email;
    
    // Fechar modal de confirmação
    this.showConfirmModal = false;
    this.userToDelete = null;

    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.applyFilter();
        this.cdr.detectChanges();
        this.showErrorModal(
          'Sucesso',
          `Usuário ${userEmail} deletado com sucesso!`,
          'success'
        );
      },
      error: (error) => {
        this.showErrorModal(
          'Erro ao Deletar Usuário',
          error.error?.message || 'Ocorreu um erro ao deletar o usuário. Por favor, tente novamente.',
          'error'
        );
      }
    });
  }

  cancelDelete() {
    this.showConfirmModal = false;
    this.userToDelete = null;
  }

  // Fechar modal ao clicar no overlay
  onConfirmModalOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.cancelDelete();
    }
  }

  // Fechar modal com ESC
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.showConfirmModal) {
      this.cancelDelete();
    }
  }
}
