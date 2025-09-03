import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, RouterModule, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  passwordStrength: 'fraca' | 'media' | 'forte' = 'fraca';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(private router: Router, private authService: AuthService) {}

  onPasswordInput() {
    this.passwordStrength = this.getPasswordStrength(this.password);
  }

  getPasswordStrength(password: string): 'fraca' | 'media' | 'forte' {
    if (password.length < 6) return 'fraca';
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]).{8,}$/.test(password)) return 'forte';
    if (password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password)) return 'media';
    return 'fraca';
  }

  onSubmit() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.showModal('error', 'Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showModal('error', 'Erro', 'As senhas não coincidem.');
      return;
    }
    if (this.passwordStrength === 'fraca') {
      this.showModal('error', 'Senha fraca', 'Escolha uma senha mais forte.');
      return;
    }
    this.showModal('loading', '', 'Criando conta...');
    this.authService.register(this.email, this.password).subscribe({
      next: (response) => {
        this.showModal('success', 'Conta criada', 'Conta criada com sucesso!');
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
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
}
