// src/app/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent, CardComponent],
  template: `
    <app-layout>
      <app-card title="Dashboard EaDuck 🦆" subtitle="Visualize suas estatísticas e métricas" size="large">
        <div class="flex justify-center space-x-8">
          <!-- Example content for the Dashboard -->
          <div class="text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Estatísticas</h3>
            <p class="text-gray-600">Aqui você pode ver suas métricas principais.</p>
            <!-- Add more dashboard content as needed -->
          </div>
        </div>
      </app-card>
    </app-layout>
  `,
  styles: []
})
export class DashboardComponent {}