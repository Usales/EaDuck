import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { EmailConfirmationModalComponent } from '../../components/email-confirmation-modal/email-confirmation-modal.component';
import { NameSetupModalComponent } from '../../components/name-setup-modal/name-setup-modal.component';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, EmailConfirmationModalComponent, NameSetupModalComponent, RouterModule, ThemeToggleComponent, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, AfterViewInit {
  @ViewChild('duckLogo', { static: false }) duckLogo!: ElementRef;
  
  email = '';
  password = '';
  confirmPassword = '';
  passwordStrength: 'fraca' | 'media' | 'forte' = 'fraca';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  // Email confirmation modal state
  emailConfirmationVisible = false;
  emailConfirmationStatus: 'sending' | 'sent' | 'error' | 'verifying' = 'sending';
  emailConfirmationError = '';
  generatedCode = '';
  pendingRegistration = false;

  // Name setup modal
  showNameSetupModal = false;

  showPassword = false;
  showConfirmPassword = false;

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

  onPasswordInput() {
    this.passwordStrength = this.getPasswordStrength(this.password);
  }

  getPasswordStrength(password: string): 'fraca' | 'media' | 'forte' {
    if (!password || password.length < 6) return 'fraca';
    
    let score = 0;
    
    // Comprimento mínimo
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    
    // Caracteres minúsculos
    if (/[a-z]/.test(password)) score++;
    
    // Caracteres maiúsculos
    if (/[A-Z]/.test(password)) score++;
    
    // Números
    if (/\d/.test(password)) score++;
    
    // Caracteres especiais
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
    
    // Determinar força baseada no score
    if (score <= 2) return 'fraca';
    if (score <= 4) return 'media';
    return 'forte';
  }

  onSubmit() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.showModal('error', 'Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    
    // Validar força da senha
    this.passwordStrength = this.getPasswordStrength(this.password);
    
    if (this.password !== this.confirmPassword) {
      this.showModal('error', 'Erro', 'As senhas não coincidem.');
      return;
    }
    
    if (this.passwordStrength === 'fraca') {
      this.showModal('error', 'Senha fraca', 'Escolha uma senha mais forte. Use pelo menos 6 caracteres com maiúsculas, números ou símbolos.');
      return;
    }
    
    if (this.password.length < 6) {
      this.showModal('error', 'Senha muito curta', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // Iniciar processo de confirmação por e-mail
    this.startEmailConfirmation();
  }

  startEmailConfirmation() {
    this.emailConfirmationVisible = true;
    this.emailConfirmationStatus = 'sending';
    this.pendingRegistration = true;
    
    // Enviar código de confirmação via backend
    this.authService.sendConfirmationCode(this.email).subscribe({
      next: (response) => {
        this.emailConfirmationStatus = 'sent';
        console.log('Código de confirmação enviado:', response);
      },
      error: (error) => {
        this.emailConfirmationStatus = 'error';
        this.emailConfirmationError = error.error?.message || 'Erro ao enviar código de confirmação';
        console.error('Erro ao enviar código:', error);
      }
    });
  }

  generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  onEmailConfirmationClose() {
    this.emailConfirmationVisible = false;
    this.pendingRegistration = false;
    this.emailConfirmationStatus = 'sending';
    this.emailConfirmationError = '';
  }

  onCodeSubmitted(code: string) {
    console.log('=== VERIFICAÇÃO DE CÓDIGO NO FRONTEND ===');
    console.log('Email:', this.email);
    console.log('Código digitado:', code);
    
    this.emailConfirmationStatus = 'verifying';
    
    // Verificar código via backend
    this.authService.verifyConfirmationCode(this.email, code).subscribe({
      next: (response) => {
        console.log('Resposta da verificação:', response);
        if (response.valid) {
          // Código válido - proceder com o registro
          console.log('✅ Código válido, prosseguindo com registro...');
          this.completeRegistration(code);
        } else {
          // Código inválido
          console.log('❌ Código inválido');
          this.emailConfirmationError = 'Código incorreto. Tente novamente.';
          this.emailConfirmationStatus = 'sent';
        }
      },
      error: (error) => {
        console.error('❌ Erro ao verificar código:', error);
        this.emailConfirmationError = error.error?.message || 'Erro ao verificar código';
        this.emailConfirmationStatus = 'sent';
      }
    });
  }

  onResendCode() {
    this.emailConfirmationStatus = 'sending';
    
    // Reenviar código via backend
    this.authService.resendConfirmationCode(this.email).subscribe({
      next: (response) => {
        this.emailConfirmationStatus = 'sent';
        console.log('Código reenviado:', response);
      },
      error: (error) => {
        this.emailConfirmationStatus = 'error';
        this.emailConfirmationError = error.error?.message || 'Erro ao reenviar código';
        console.error('Erro ao reenviar código:', error);
      }
    });
  }

  completeRegistration(confirmationCode: string) {
    console.log('=== COMPLETANDO REGISTRO ===');
    console.log('Email:', this.email);
    
    this.authService.registerWithConfirmation(this.email, this.password, confirmationCode).subscribe({
      next: (response) => {
        console.log('✅ Registro concluído com sucesso:', response);
        this.emailConfirmationVisible = false;
        
        // Definir o usuário atual com o papel correto retornado pelo backend
        const user: User = {
          id: parseInt(response.userId, 10),
          email: this.email,
          name: 'Usuário Anônimo',
          role: response.role || 'STUDENT',
          isActive: true,
          needsNameSetup: true
        };
        this.authService.setCurrentUser(user);
        
        // Após o registro, mostrar o modal de configuração de nome
        this.showNameSetupModal = true;
      },
      error: (err) => {
        console.error('❌ Erro no registro:', err);
        this.emailConfirmationVisible = false;
        let msg = 'Erro de cadastro.';
        if (err.error && err.error.message) {
          msg = err.error.message;
        } else if (err.status === 409) {
          msg = 'E-mail já cadastrado.';
        }
        this.showModal('error', 'Erro de cadastro', msg);
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

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onNameSet(name: string) {
    this.showNameSetupModal = false;
    // Após definir o nome, fazer login automaticamente
    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Erro ao fazer login após registro:', err);
        this.showModal('error', 'Erro', 'Erro ao fazer login. Tente fazer login manualmente.');
      }
    });
  }

  onCloseNameSetup() {
    // Não permitir fechar o modal sem definir o nome
    // O usuário deve definir o nome para continuar
  }
}
