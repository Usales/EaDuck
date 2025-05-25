import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-confirm-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-2xl font-bold text-center mb-6">Confirmar Redefinição de Senha 🔑</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="token" class="block text-sm font-medium text-gray-700">Token</label>
            <input [(ngModel)]="token" type="text" id="token" name="token" class="mt-1 block w-full p-2 border rounded-md" placeholder="Insira o token recebido" required>
          </div>
          <div class="mb-6">
            <label for="newPassword" class="block text-sm font-medium text-gray-700">Nova Senha</label>
            <input [(ngModel)]="newPassword" type="password" id="newPassword" name="newPassword" class="mt-1 block w-full p-2 border rounded-md" placeholder="********" required>
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Redefinir Senha</button>
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
  styleUrls: ['./confirm-reset-password.component.scss']
})
export class ConfirmResetPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  showModal: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Extrair o token da query string
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      console.log('Token recebido da URL:', this.token); // Log para depuração
    });
  }

  onSubmit() {
    if (!this.token || !this.newPassword) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      this.successMessage = '';
      this.showModal = true;
      return;
    }
    if (this.newPassword.length < 8 || !/[a-zA-Z]/.test(this.newPassword) || !/[0-9]/.test(this.newPassword)) {
      this.errorMessage = 'A senha deve ter pelo menos 8 caracteres, incluindo letras e números.';
      this.showModal = true;
      return;
    }
    console.log('Enviando token:', this.token); // Log para depuração
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = false;
    this.authService.confirmResetPassword(this.token.trim(), this.newPassword).subscribe(
      response => {
        this.successMessage = response.message || 'Senha redefinida com sucesso!';
        this.errorMessage = '';
        this.showModal = true;
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 2000);
      },
      error => {
        const errorMsg = error.error?.message || 'Erro ao redefinir senha. Tente novamente.';
        this.errorMessage = errorMsg;
        this.successMessage = '';
        this.showModal = true;
        console.error('Erro no confirm-reset-password:', error);
      }
    );
  }

  closeModal() {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }
}