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
    if (!this.email || !this.password) {
      this.showModal('error', 'Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    this.showModal('loading', '', 'Autenticando...');
    this.authService.login(this.email, this.password).subscribe({
      next: (user) => {
        console.log('Login successful, user:', user);
        console.log('needsNameSetup:', user.needsNameSetup);
        console.log('user.name:', user.name);
        this.closeModal();
        // Verificar se o usuário precisa configurar o nome
        if (user.needsNameSetup) {
          console.log('Showing name setup modal');
          this.showNameSetupModal = true;
        } else {
          console.log('Navigating to home');
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
        if (msg.includes('inativo') || msg.includes('inativa')) {
          this.showModal('error', 'Usuário inativo', 'Sua conta está inativa. Entre em contato com o administrador do sistema pelo e-mail compeaduck@gmail.com para ativação.');
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

  onNameSet(name: string) {
    this.showNameSetupModal = false;
    // Atualizar o usuário atual com o novo nome
    this.authService.getProfile().subscribe(user => {
      this.authService.setCurrentUser(user);
      this.router.navigate(['/home']);
    });
  }

  onCloseNameSetup() {
    // Não permitir fechar o modal sem definir o nome
    // O usuário deve definir o nome para continuar
  }

  loginWithGoogle() {
    // Redirecionar para o endpoint OAuth2 do backend
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }
}
