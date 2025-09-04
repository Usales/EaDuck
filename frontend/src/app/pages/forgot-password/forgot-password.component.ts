import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthService } from '../../auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, HttpClientModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email = '';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  onSubmit() {
    if (!this.email) {
      this.showModal('error', 'Erro', 'Por favor, insira seu email.');
      return;
    }
    this.showModal('loading', '', 'Enviando email de redefinição...');
    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.showModal('success', 'Email enviado', 'Um email com instruções para redefinir sua senha foi enviado para ' + this.email);
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        let msg = 'Erro ao enviar email de redefinição.';
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

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
