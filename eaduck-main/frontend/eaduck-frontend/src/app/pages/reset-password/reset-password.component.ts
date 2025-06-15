import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService } from '../../auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, HttpClientModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  email = '';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  onSubmit() {
    if (!this.email) {
      this.showModal('error', 'Erro', 'Por favor, preencha o e-mail.');
      return;
    }
    this.showModal('loading', '', 'Enviando link de redefinição...');
    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.showModal('success', 'E-mail enviado', 'Verifique sua caixa de entrada para redefinir a senha.');
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        let msg = 'Erro ao enviar e-mail de recuperação.';
        if (err.error && err.error.message) {
          msg = err.error.message;
        } else if (err.status === 404) {
          msg = 'E-mail não encontrado.';
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
}
