// src/app/notifications/notifications.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent, CardComponent],
  template: `
    <app-layout>
      <app-card title="Notificações EaDuck 🦆" subtitle="Veja suas últimas notificações" size="large">
        <div class="flex justify-center space-x-8">
          <!-- Example content for Notifications -->
          <div class="text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Últimas Notificações</h3>
            <p class="text-gray-600">Você não tem novas notificações no momento.</p>
            <!-- Add more notifications content as needed -->
          </div>
        </div>
      </app-card>
    </app-layout>
  `,
  styles: []
})
export class NotificationsComponent {}