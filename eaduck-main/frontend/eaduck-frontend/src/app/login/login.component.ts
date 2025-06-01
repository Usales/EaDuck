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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // Manter se SCSS tiver estilos; remover se vazio
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  showPassword: boolean = false; // Adicionado para o botão de "olho"
  errorMessage: string = '';
  successMessage: string = '';
  showModal: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    console.log('LoginComponent carregado');
  }

  togglePasswordVisibility() { // Adicionado para alternar visibilidade
    this.showPassword = !this.showPassword;
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