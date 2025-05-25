import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-2xl font-bold text-center mb-6">Cadastro EaDuck 🦆</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium text-gray-700">E-mail</label>
            <input [(ngModel)]="email" type="email" id="email" name="email" class="mt-1 block w-full p-2 border rounded-md" placeholder="seu@email.com" required>
          </div>
          <div class="mb-6">
            <label for="password" class="block text-sm font-medium text-gray-700">Senha</label>
            <input [(ngModel)]="password" type="password" id="password" name="password" class="mt-1 block w-full p-2 border rounded-md" placeholder="********" required>
          </div>
          <div *ngIf="errorMessage" class="mb-4 text-red-600 text-center">
            {{ errorMessage }}
          </div>
          <div *ngIf="successMessage" class="mb-4 text-green-600 text-center">
            {{ successMessage }}
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">Cadastrar</button>
          <p class="mt-4 text-center">
            <a [routerLink]="['/login']" class="text-blue-600 hover:underline cursor-pointer">Já tem uma conta? Faça login</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      this.successMessage = '';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor, insira um e-mail válido.';
      this.successMessage = '';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.register(this.email, this.password).subscribe(
      response => {
        this.successMessage = 'Cadastro realizado com sucesso! Redirecionando...';
        this.errorMessage = '';
        localStorage.setItem('token', response.token);
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error => {
        this.errorMessage = error.error || 'Erro ao cadastrar. Tente novamente.';
        this.successMessage = '';
      }
    );
  }
}