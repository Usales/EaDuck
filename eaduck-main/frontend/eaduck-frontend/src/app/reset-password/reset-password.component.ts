import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-2xl font-bold text-center mb-6">Redefinir Senha 🔑</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
            <input [(ngModel)]="email" type="email" id="email" name="email" class="mt-1 block w-full p-2 border rounded-md" placeholder="seu@email.com" required>
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Enviar Link</button>
          <p class="mt-4 text-center">
            <a [routerLink]="['/login']" class="text-blue-600 hover:underline cursor-pointer">Voltar ao login</a>
          </p>
        </form>
      </div>

      <!-- Modal para Mensagens -->
      <div *ngIf="showModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
          <h3 class="text-lg font-semibold {{ errorMessage ? 'text-red-600' : 'text-green-600' }} mb-4">
            {{ errorMessage ? 'Erro' : 'Sucesso' }}
          </h3>
          <p class="text-gray-700">{{ errorMessage || successMessage }}</p>
          <div class="mt-6 flex justify-end">
            <button (click)="closeModal()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  email: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  showModal: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit() {
    if (!this.email) {
      this.errorMessage = 'Por favor, insira seu e-mail.';
      this.successMessage = '';
      this.showModal = true;
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor, insira um e-mail válido.';
      this.successMessage = '';
      this.showModal = true;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = false;
    this.authService.resetPassword(this.email).subscribe(
      response => {
        this.successMessage = response.message || 'Link de redefinição enviado para seu e-mail.';
        this.errorMessage = '';
        this.showModal = true;
      },
      error => {
        const errorMsg = error.error?.message || 'Erro ao solicitar redefinição. Tente novamente.';
        this.errorMessage = errorMsg;
        this.successMessage = '';
        this.showModal = true;
        console.error('Erro no reset-password:', error);
      }
    );
  }

  closeModal() {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }
}