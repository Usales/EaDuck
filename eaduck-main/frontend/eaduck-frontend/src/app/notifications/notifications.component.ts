import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LayoutComponent } from '../layout/layout.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="animate-fade-in bg-white bg-opacity-10 backdrop-filter backdrop-blur-md p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">Notificações 🔔</h2>
        <p class="text-gray-600 mb-6">Suas notificações mais recentes.</p>
        <div *ngIf="notifications.length === 0" class="text-center text-gray-600 mb-6">
          Nenhuma notificação disponível.
        </div>
        <div *ngFor="let notification of notifications" class="bg-gray-50 p-4 mb-4 rounded-lg shadow">
          <p class="text-gray-700">{{ notification.message }}</p>
          <p class="text-sm text-gray-500">{{ notification.createdAt | date:'short' }}</p>
        </div>
        <div class="flex justify-between">
          <button (click)="fetchNotifications()" class="bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">
            Atualizar Notificações
          </button>
          <a [routerLink]="['/home']" class="bg-cyan-500 text-white p-3 rounded-md hover:bg-cyan-600 hover:scale-105 transition-all">
            Voltar para Home
          </a>
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
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.fetchNotifications();
  }

  fetchNotifications() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Nenhum token encontrado');
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<any[]>('http://localhost:8080/api/notifications/list', { headers }).subscribe(
      response => {
        this.notifications = response;
      },
      error => {
        console.error('Erro ao carregar notificações:', error);
      }
    );
  }
}