import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, CardComponent],
  template: `
    <app-card title="Login EaDuck" subtitle="Conecte-se à sua conta para acessar o painel" size="small">
      <form (ngSubmit)="onSubmit()">
        <div class="mb-4 relative">
          <label for="email" class="block text-sm font-medium text-gray-300">E-mail</label>
          <div class="relative">
            <input [(ngModel)]="email" type="email" id="email" name="email" required #emailInput="ngModel"
                   class="mt-1 block w-full p-3 pl-10 border rounded-md bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                   [class.border-red-500]="emailInput.invalid && emailInput.touched" placeholder="seu@email.com">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12h2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4h2m0 0a4 4 0 004-4 4 4 0 00-4-4 4 4 0 00-4 4m8 0a4 4 0 014 4 4 4 0 01-4 4z"/>
            </svg>
          </div>
          <div *ngIf="emailInput.invalid && emailInput.touched" class="text-red-500 text-sm mt-1">E-mail é obrigatório ou inválido.</div>
        </div>
        <div class="mb-6 relative">
          <label for="password" class="block text-sm font-medium text-gray-300">Senha</label>
          <div class="relative">
            <input [(ngModel)]="password" type="password" id="password" name="password" required #passwordInput="ngModel"
                   class="mt-1 block w-full p-3 pl-10 border rounded-md bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                   [class.border-red-500]="passwordInput.invalid && passwordInput.touched" placeholder="********">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2v2h-4v-2zm-2-4h4a4 4 0 014 4v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2a4 4 0 014-4z"/>
            </svg>
          </div>
          <div *ngIf="passwordInput.invalid && passwordInput.touched" class="text-red-500 text-sm mt-1">Senha é obrigatória.</div>
        </div>
        <button type="submit" class="w-full bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Logar</button>
        <div class="mt-6 flex flex-col space-y-4 text-sm">
        <a [routerLink]="['/reset-password']" class="text-cyan-400 hover:underline cursor-pointer hover:scale-105 transition-all text-center">Esqueceu sua senha?</a>
        <a [routerLink]="['/register']" class="text-cyan-400 hover:underline cursor-pointer hover:scale-105 transition-all text-center">Não tem uma conta? Cadastre-se</a>
</div>
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
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  showModal: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    console.log('LoginComponent carregado');
  }

  onSubmit() {
    console.log('onSubmit chamado com email:', this.email, 'e senha:', this.password);
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      this.showModal = true;
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor, insira um e-mail válido.';
      this.showModal = true;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = false;
    this.authService.login(this.email, this.password).subscribe(
      response => {
        console.log('Login bem-sucedido:', response);
        localStorage.setItem('token', response.token);
        this.successMessage = 'Login bem-sucedido!';
        this.showModal = true;
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/home']);
        }, 2000);
      },
      error => {
        console.error('Erro no login:', error);
        if (error.status === 401) {
          this.errorMessage = 'Credenciais inválidas. Verifique seu e-mail ou senha.';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Erro ao fazer login. Tente novamente.';
        } else {
          this.errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
        }
        this.showModal = true;
      }
    );
  }

  closeModal() {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }
}