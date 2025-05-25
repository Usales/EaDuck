import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="text-center animate-fade-in bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-8 rounded-2xl shadow-lg max-w-2xl mx-auto" size="large">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Bem-vindo ao Painel EaDuck 🦆</h2>
        <p class="text-gray-600 mb-6">Selecione uma opção no menu à esquerda para começar.</p>
        <div class="flex justify-center space-x-4">
          <a [routerLink]="['/dashboard']" class="bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Ir para Dashboard</a>
          <a [routerLink]="['/notifications']" class="bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Ver Notificações</a>
        </div>
      </div>
    </app-layout>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.5s ease-in-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
  ]
})
export class HomeComponent {}