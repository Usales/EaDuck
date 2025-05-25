// src/app/layout/layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex min-h-screen bg-gray-100">
      <aside class="w-64 bg-[#2C3E50] text-white p-4 animate-slide-in">
        <div class="text-2xl font-bold mb-6 flex items-center space-x-2">
          <img src="https://cdn-icons-png.flaticon.com/128/5404/5404967.png" alt="EaDuck Logo" class="w-8 h-8" />
          <span>EaDuck</span>
        </div>
        <nav>
          <ul>
            <li class="mb-4">
              <a [routerLink]="['/home']" routerLinkActive="active" class="flex items-center space-x-2 hover:text-cyan-400 hover:bg-[#2E4057] transition-all p-2 rounded-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>Home</span>
              </a>
            </li>
            <li class="mb-4">
              <a [routerLink]="['/dashboard']" routerLinkActive="active" class="flex items-center space-x-2 hover:text-cyan-400 hover:bg-[#2E4057] transition-all p-2 rounded-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span>Dashboard</span>
              </a>
            </li>
            <li class="mb-4">
              <a [routerLink]="['/notifications']" routerLinkActive="active" class="flex items-center space-x-2 hover:text-cyan-400 hover:bg-[#2E4057] transition-all p-2 rounded-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span>Notificações</span>
              </a>
            </li>
            <li class="mb-4">
              <a [routerLink]="['/settings']" routerLinkActive="active" class="flex items-center space-x-2 hover:text-cyan-400 hover:bg-[#2E4057] transition-all p-2 rounded-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Configurações</span>
              </a>
            </li>
            <li class="mt-8">
              <button (click)="logout()" class="flex items-center space-x-2 text-red-400 hover:text-red-300 hover:bg-[#2E4057] transition-all p-2 rounded-md w-full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span>Sair</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <main class="flex-1 p-10">
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styles: [
    `
      .animate-slide-in {
        animation: slideIn 0.3s ease-in-out;
      }

      @keyframes slideIn {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }

      .active {
        background-color: #2E4057;
        color: #00C4FF;
        border-radius: 0.5rem;
      }
    `
  ]
})
export class LayoutComponent {
  constructor(private router: Router) { }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}