import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { NameSetupModalComponent } from '../../components/name-setup-modal/name-setup-modal.component';
import { AuthService } from '../../services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, ThemeToggleComponent, NameSetupModalComponent, RouterModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('duckLogo', { static: false }) duckLogo!: ElementRef;
  
  email = '';
  password = '';
  showPassword = false;

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  // Name setup modal
  showNameSetupModal = false;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Inicia a animação quando o componente é carregado
  }

  ngAfterViewInit() {
    // Aguarda 1.5 segundos após a animação de queda terminar, então inicia o bounce contínuo
    setTimeout(() => {
      if (this.duckLogo) {
        this.duckLogo.nativeElement.classList.add('continuous-bounce');
      }
    }, 1500);
  }

  onSubmit() {
    // Validação de campos
    if (!this.email || !this.password) {
      this.showModal('error', 'Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showModal('error', 'Erro', 'Por favor, insira um e-mail válido.');
      return;
    }

    this.showModal('loading', '', 'Autenticando...');
    
    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        this.closeModal();
        // Verificar se o usuário precisa configurar o nome
        // O backend já verifica se ADMIN tem nomeCompleto, CPF e endereço preenchidos
        if (user.needsNameSetup) {
          this.currentUserRole = user.role || 'STUDENT';
          this.showNameSetupModal = true;
        } else {
          // Se não precisa mais configurar, garantir que o cache está atualizado
          if (user.role === 'ADMIN' && user.nomeCompleto && user.cpf && user.endereco) {
            localStorage.setItem('adminDataFilled', 'true');
          }
          if (user.role === 'TEACHER' && user.nomeCompleto && user.cpf && user.endereco && user.titulacao) {
            localStorage.setItem('teacherDataFilled', 'true');
          }
          if (user.role === 'STUDENT' && user.name && user.nomeCompleto && user.cpf && 
              user.dataNascimento && user.nomeMae && user.nomePai && user.telefone && user.endereco) {
            localStorage.setItem('studentDataFilled', 'true');
          }
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        let msg = '';
        if (err?.error) {
          if (typeof err.error === 'string') {
            msg = err.error.toLowerCase();
          } else if (err.error.message) {
            msg = err.error.message.toLowerCase();
          }
        }
        
        if (err?.status === 0) {
          this.showModal('error', 'Erro de conexão', 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
        } else if (err?.status === 401) {
          if (msg.includes('inativo') || msg.includes('inativa')) {
            this.showModal('error', 'Usuário inativo', 'Sua conta está inativa. Entre em contato com o administrador do sistema pelo e-mail compeaduck@gmail.com para ativação.');
          } else {
            this.showModal('error', 'Erro de autenticação', 'E-mail ou senha incorretos.');
          }
        } else if (err?.status === 403) {
          this.showModal('error', 'Acesso negado', 'Você não tem permissão para acessar esta conta.');
        } else if (err?.status >= 500) {
          this.showModal('error', 'Erro do servidor', 'Ocorreu um erro no servidor. Tente novamente mais tarde.');
        } else {
          this.showModal('error', 'Erro de autenticação', 'E-mail ou senha incorretos.');
        }
      }
    });
  }

  showModal(type: 'success' | 'error' | 'info' | 'loading', title: string, message: string) {
    this.modalType = type;
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  currentUserRole: string = 'STUDENT';

  onNameSet(name: string) {
    this.showNameSetupModal = false;
    // Atualizar o usuário atual com o novo nome
    this.authService.getProfile().subscribe(user => {
      this.authService.setCurrentUser(user);
      // Se for ADMIN e já preencheu os dados, garantir que o cache está salvo
      if (user.role === 'ADMIN' && user.nomeCompleto && user.cpf && user.endereco) {
        localStorage.setItem('adminDataFilled', 'true');
      }
      // Se for TEACHER e já preencheu os dados, garantir que o cache está salvo
      if (user.role === 'TEACHER' && user.nomeCompleto && user.cpf && user.endereco && user.titulacao) {
        localStorage.setItem('teacherDataFilled', 'true');
      }
      // Se for STUDENT e já preencheu os dados, garantir que o cache está salvo
      if (user.role === 'STUDENT' && user.name && user.nomeCompleto && user.cpf && 
          user.dataNascimento && user.nomeMae && user.nomePai && user.telefone && user.endereco) {
        localStorage.setItem('studentDataFilled', 'true');
      }
      this.router.navigate(['/home']);
    });
  }

  onCloseNameSetup() {
    // Não permitir fechar o modal sem definir o nome
    // O usuário deve definir o nome para continuar
  }
}
