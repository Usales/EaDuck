import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bg-blue-600 text-white p-4 shadow-md fixed w-full top-0 z-10">
      <div class="container mx-auto flex justify-between items-center">
        <div class="text-lg font-semibold">
          Bem-vindo(a), {{ username }} 🦆
        </div>
        <button (click)="logout()" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
          Sair
        </button>
      </div>
    </nav>
  `,
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit {
  username: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.loadUsername();
  }

  loadUsername() {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.username = payload.sub || 'Usuário';
    } else {
      this.username = 'Usuário';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}