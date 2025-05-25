import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  showModal: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    console.log('LoginComponent carregado');
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha todos os campos.';
      this.showModal = true;
      console.log(this.errorMessage);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor, insira um e-mail válido.';
      this.showModal = true;
      console.log(this.errorMessage);
      return;
    }

    this.errorMessage = '';
    this.showModal = false;
    this.authService.login(this.email, this.password).subscribe(
      response => {
        console.log('Login bem-sucedido:', response);
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashboard']);
      },
      error => {
        console.error('Erro no login:', error);
        if (error.status === 401) {
          this.errorMessage = 'Credenciais inválidas. Verifique seu e-mail ou senha.';
        } else if (error.status === 400) {
          this.errorMessage = error.error || 'Erro ao fazer login. Tente novamente.';
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
  }
}