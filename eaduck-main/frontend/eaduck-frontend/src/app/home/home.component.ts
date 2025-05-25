// src/app/home/home.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent, CardComponent],
  template: `
    <app-layout>
      <app-card title="Bem-vindo ao Painel EaDuck 🦆" subtitle="Selecione uma opção no menu à esquerda para começar" size="large" style="width: 100%; max-width: none; min-height: 90vh;">
        <div class="flex justify-center space-x-8">
          <a [routerLink]="['/dashboard']" class="bg-cyan-500 text-white px-8 py-4 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all text-lg">Ir para Dashboard</a>
          <a [routerLink]="['/notifications']" class="bg-transparent border border-cyan-500 text-cyan-500 px-8 py-4 rounded-md hover:bg-cyan-500 hover:text-white hover:scale-105 transition-all text-lg">Ver Notificações</a>
        </div>
      </app-card>
    </app-layout>
  `,
  styles: []
})
export class HomeComponent {}