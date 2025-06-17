import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-list',
  template: `
    <div class="notification-list">
      <div *ngIf="notifications.length === 0" class="no-notifications">
        Nenhuma notificação encontrada
      </div>
      <div *ngFor="let notification of notifications" class="notification-item" [class.unread]="!notification.isRead">
        <div class="notification-content">
          <h4>{{ notification.title }}</h4>
          <p>{{ notification.message }}</p>
          <small>{{ notification.createdAt | date:'dd/MM/yyyy HH:mm' }}</small>
        </div>
        <button *ngIf="!notification.isRead" (click)="markAsRead(notification.id)" class="mark-read-btn">
          Marcar como lida
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .notification-item {
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .notification-item.unread {
      background-color: #f0f7ff;
    }
    .notification-content {
      flex: 1;
    }
    .mark-read-btn {
      padding: 5px 10px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .mark-read-btn:hover {
      background-color: #0056b3;
    }
    .no-notifications {
      padding: 20px;
      text-align: center;
      color: #666;
    }
  `]
})
export class NotificationListComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  private notifSub?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.notifSub = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationService.loadNotifications();
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  markAsRead(notificationId: number) {
    this.notificationService.markAsRead(notificationId).subscribe();
  }
} 