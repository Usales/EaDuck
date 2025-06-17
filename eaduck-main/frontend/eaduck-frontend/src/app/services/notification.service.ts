import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  message: string;
  notificationType: string;
  createdAt: string;
  isRead: boolean;
  title?: string;
  read?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUserNotifications(userId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  markAsRead(notificationId: number): Observable<any> {
    return new Observable(observer => {
      this.http.put(`${this.apiUrl}/${notificationId}/read`, {}, {
        headers: this.authService.getAuthHeaders()
      }).subscribe({
        next: () => {
          this.loadNotifications();
          observer.next(null);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}`, notification, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getNotifications(): Observable<Notification[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return of([]);
    return this.getUserNotifications(user.id);
  }

  loadNotifications() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.getUserNotifications(user.id).subscribe(notifs => {
      this.notificationsSubject.next(notifs.map(n => ({ ...n, isRead: n.isRead ?? n.read })));
    });
  }
} 