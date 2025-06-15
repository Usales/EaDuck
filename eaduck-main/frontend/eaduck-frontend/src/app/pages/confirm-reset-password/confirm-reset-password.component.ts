import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService } from '../../auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-confirm-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, HttpClientModule],
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.scss']
})
export class ConfirmResetPasswordComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength: 'fraca' | 'media' | 'forte' = 'fraca';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
    });
  }

  onPasswordInput() {
    this.passwordStrength = this.getPasswordStrength(this.newPassword);
  }

  getPasswordStrength(password: string): 'fraca' | 'media' | 'forte' {
    if (password.length < 6) return 'fraca';
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]).{8,}$/.test(password)) return 'forte';
    if (password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password)) return 'media';
    return 'fraca';
  }

  onSubmit() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showModal('error', 'Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showModal('error', 'Erro', 'As senhas não coincidem.');
      return;
    }
    if (this.passwordStrength === 'fraca') {
      this.showModal('error', 'Senha fraca', 'Escolha uma senha mais forte.');
      return;
    }
    this.showModal('loading', '', 'Redefinindo senha...');
    this.authService.confirmResetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.showModal('success', 'Senha redefinida', 'Sua senha foi redefinida com sucesso!');
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        let msg = 'Erro ao redefinir senha.';
        if (err.error && err.error.message) {
          msg = err.error.message;
        }
        this.showModal('error', 'Erro', msg);
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
} 