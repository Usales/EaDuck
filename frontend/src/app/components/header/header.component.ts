import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription, of } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter, catchError, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  showDropdown = false;
  loading = false;
  private updateSubscription: Subscription | null = null;
  private isLoginPage = false;
  private routeSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;
  private notificationsSubscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    public authService: AuthService,
    private router: Router
  ) {
    // Monitora mudanças na rota
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login';
      this.handleNotifications();
    });
  }

  ngOnInit() {
    // Inscreve-se nas mudanças do usuário atual
    this.userSubscription = this.authService.currentUser$.subscribe(() => {
      this.handleNotifications();
    });
    // Inscreve-se nas notificações globais
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs.sort((a, b) => b.id - a.id);
    });
  }

  private handleNotifications() {
    const isAuthenticated = this.authService.isAuthenticated();
    const currentUser = this.authService.getCurrentUser();

    if (isAuthenticated && currentUser && !this.isLoginPage) {
      this.notificationService.loadNotifications();
      this.setupUpdateInterval();
    } else {
      this.clearNotifications();
    }
  }

  private setupUpdateInterval() {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    this.updateSubscription = interval(30000).subscribe(() => {
      if (!this.isLoginPage && this.authService.isAuthenticated()) {
        this.notificationService.loadNotifications();
      }
    });
  }

  private clearNotifications() {
    this.notifications = [];
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }
  }

  ngOnDestroy() {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  markAsRead(notification: Notification) {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).pipe(
      catchError(error => {
        console.error('Erro ao marcar notificação como lida:', error);
        return of(null);
      })
    ).subscribe();
  }
} 