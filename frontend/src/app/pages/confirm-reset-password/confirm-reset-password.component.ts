import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
export class ConfirmResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';

  // Modal state
  modalVisible = false;
  modalType: 'success' | 'error' | 'info' | 'loading' = 'info';
  modalTitle = '';
  modalMessage = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.showModal('error', 'Erro', 'Token inválido ou ausente.');
      }
    });
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
    this.showModal('loading', '', 'Redefinindo senha...');
    this.authService.confirmResetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.showModal('success', 'Sucesso', 'Senha redefinida com sucesso.');
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 3000);
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

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
