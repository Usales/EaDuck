import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-confirm-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, CardComponent],
  template: `
    <app-card title="Confirmar Redefinição de Senha" subtitle="Insira o token recebido e sua nova senha">
      <form (ngSubmit)="onSubmit()">
        <div class="mb-4">
          <label for="token" class="block text-sm font-medium text-gray-300">Token</label>
          <input [(ngModel)]="token" type="text" id="token" name="token" required #tokenInput="ngModel"
                 class="mt-1 block w-full p-3 border rounded-md bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                 [class.border-red-500]="tokenInput.invalid && tokenInput.touched" placeholder="Insira o token recebido">
          <div *ngIf="tokenInput.invalid && tokenInput.touched" class="text-red-500 text-sm mt-1">Token é obrigatório.</div>
        </div>
        <div class="mb-6">
          <label for="newPassword" class="block text-sm font-medium text-gray-300">Nova Senha</label>
          <input [(ngModel)]="newPassword" type="password" id="newPassword" name="newPassword" required #passwordInput="ngModel"
                 class="mt-1 block w-full p-3 border rounded-md bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                 [class.border-red-500]="passwordInput.invalid && passwordInput.touched" placeholder="********">
          <div *ngIf="passwordInput.invalid && passwordInput.touched" class="text-red-500 text-sm mt-1">Senha é obrigatória.</div>
          <div *ngIf="passwordInput.valid && passwordInput.touched && !isPasswordValid()" class="text-red-500 text-sm mt-1">
            A senha deve ter pelo menos 8 caracteres, incluindo letras e números.
          </div>
        </div>
        <button type="submit" class="w-full bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Redefinir Senha</button>
        <p class="mt-4 text-center">
          <a [routerLink]="['/login']" class="text-cyan-400 hover:underline cursor-pointer">Voltar para Login</a>
        </p>
      </form>
      <!-- Modal para Mensagens -->
      <div *ngIf="showModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 animate-fade-in">
        <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
          <h3 class="text-lg font-semibold" [ngClass]="errorMessage ? 'text-red-600' : 'text-green-600'" class="mb-4">
            {{ errorMessage ? 'Erro' : 'Sucesso' }}
          </h3>
          <p class="text-gray-700">{{ errorMessage || successMessage }}</p>
          <div class="mt-6 flex justify-end">
            <button (click)="closeModal()" class="bg-cyan-500 text-white px-4 py-2 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Fechar</button>
          </div>
        </div>
      </div>
    </app-card>
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
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      console.log('Token recebido da URL:', this.token);
    });
  }

  isPasswordValid(): boolean {
    return this.newPassword.length >= 8 && /[a-zA-Z]/.test(this.newPassword) && /[0-9]/.test(this.newPassword);
  }

  onSubmit() {
    console.log('onSubmit chamado com token:', this.token, 'e nova senha:', this.newPassword);
    if (!this.token || !this.newPassword) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      this.showModal = true;
      return;
    }
    if (!this.isPasswordValid()) {
      this.errorMessage = 'A senha deve ter pelo menos 8 caracteres, incluindo letras e números.';
      this.showModal = true;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = false;
    this.authService.confirmResetPassword(this.token.trim(), this.newPassword).subscribe(
      response => {
        this.successMessage = response.message || 'Senha redefinida com sucesso!';
        this.showModal = true;
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/login']);
        }, 2000);
      },
      error => {
        this.errorMessage = error.error?.message || 'Erro ao redefinir senha. Tente novamente.';
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