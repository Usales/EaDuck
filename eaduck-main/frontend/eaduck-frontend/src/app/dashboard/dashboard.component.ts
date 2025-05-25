import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="animate-fade-in bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Dashboard 📊</h2>
        <p class="text-gray-600 mb-6">Bem-vindo ao seu dashboard! Aqui você pode visualizar suas métricas e atividades.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-200 p-4 rounded-md">
            <h3 class="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
            <p class="text-gray-600">Nenhuma atividade recente.</p>
          </div>
          <div class="bg-gray-200 p-4 rounded-md">
            <h3 class="text-lg font-semibold text-gray-800">Estatísticas</h3>
            <p class="text-gray-600">Nenhuma estatística disponível.</p>
          </div>
        </div>
        <div class="mt-6 text-center">
          <a [routerLink]="['/home']" class="bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">Voltar para Home</a>
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
export class DashboardComponent {}