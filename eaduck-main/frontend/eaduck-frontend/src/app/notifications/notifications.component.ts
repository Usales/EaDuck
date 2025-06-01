import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutComponent } from '../layout/layout.component';
import { CardComponent } from '../card/card.component';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutComponent, CardComponent],
  template: `
    <app-layout>
      <app-card title="Notificações EaDuck 🦆" subtitle="Veja suas últimas notificações e tarefas" size="large">
        <div class="flex justify-center space-x-8">
          <div class="text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Notificações</h3>
            <ng-container *ngIf="notifications.length > 0; else noNotifications">
              <ul class="space-y-4">
                <li *ngFor="let notification of notifications" class="text-gray-600">
                  <p><strong>{{ notification.notificationType }}</strong>: {{ notification.message }}</p>
                  <p class="text-sm text-gray-400">{{ notification.createdAt | date:'short' }}</p>
                </li>
              </ul>
            </ng-container>
            <ng-template #noNotifications>
              <p class="text-gray-600">Você não tem novas notificações no momento.</p>
            </ng-template>
          </div>
          <div class="text-center">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Tarefas</h3>
            <ng-container *ngIf="tasks.length > 0; else noTasks">
              <ul class="space-y-4">
                <li *ngFor="let task of tasks" class="text-gray-600">
                  <p><strong>{{ task.title }}</strong>: {{ task.description }}</p>
                  <p class="text-sm text-gray-400">Prazo: {{ task.dueDate | date:'short' }}</p>
                </li>
              </ul>
            </ng-container>
            <ng-template #noTasks>
              <p class="text-gray-600">Você não tem tarefas pendentes no momento.</p>
            </ng-template>
          </div>
        </div>
      </app-card>
    </app-layout>
  `,
  styles: []
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  tasks: any[] = [];
  classrooms: any[] = [];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadClassrooms();
  }

  loadNotifications(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.notificationService.getNotifications(userId).subscribe({
        next: (data) => this.notifications = data,
        error: (error) => {
          console.error('Erro ao carregar notificações:', error);
          this.notifications = [];
        }
      });
    }
  }

  loadClassrooms(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8080/api/users/me/classrooms', { headers }).subscribe({
      next: (data) => {
        this.classrooms = data;
        this.loadTasks();
      },
      error: (error) => console.error('Erro ao carregar turmas:', error)
    });
  }

  loadTasks(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.tasks = [];
    this.classrooms.forEach(classroom => {
      this.http.get<any[]>(`http://localhost:8080/api/tasks/classroom/${classroom.id}`, { headers }).subscribe({
        next: (data) => this.tasks.push(...data),
        error: (error) => console.error('Erro ao carregar tarefas:', error)
      });
    });
  }
}