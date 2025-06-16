import { Component, OnInit } from '@angular/core';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  notifications: Notification[] = [];
  showDropdown = false;
  loading = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.loading = true;
    this.notificationService.getUserNotifications(user.id).subscribe({
      next: (notifs) => {
        this.notifications = notifs.sort((a, b) => b.id - a.id);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  markAsRead(notification: Notification) {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).subscribe(() => {
      notification.isRead = true;
    });
  }
} 