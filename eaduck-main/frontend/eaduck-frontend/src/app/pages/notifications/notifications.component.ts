import { Component, OnInit, OnDestroy } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  loading = false;
  showModal = false;
  newNotification: Partial<Notification> = { title: '', message: '', notificationType: 'AVISO' };
  recipientType: 'USER' | 'CLASSROOM' = 'USER';
  users: User[] = [];
  classrooms: Classroom[] = [];
  selectedUserId: number | null = null;
  selectedClassroomId: number | null = null;
  searchText: string = '';
  filterType: string = 'ALL';
  filterRead: string = 'ALL';
  sendError: string | null = null;
  private notificationsSubscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private userService: UserService,
    private classroomService: ClassroomService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    if (user.role === 'STUDENT') {
      this.classroomService.getMyClassrooms().subscribe(classrooms => {
        this.notificationService.loadNotifications();
      });
    } else if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      this.notificationService.loadNotifications();
      this.userService.getAllUsers().subscribe({
        next: users => this.users = users,
        error: (err) => {
          if (err.status === 403) {
            // Não faz nada
          }
        }
      });
      this.classroomService.getAllClassrooms().subscribe({
        next: classrooms => this.classrooms = classrooms,
        error: (err) => {
          if (err.status === 403) {
            // Não faz nada
          }
        }
      });
    }
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs.sort((a, b) => b.id - a.id);
    });
  }

  ngOnDestroy() {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  markAsRead(notification: Notification) {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).subscribe();
  }

  openModal() {
    if (!this.isAdminOrTeacher) return;
    this.showModal = true;
    this.newNotification = { title: '', message: '', notificationType: 'AVISO' };
    this.recipientType = 'USER';
    this.selectedUserId = null;
    this.selectedClassroomId = null;
  }

  closeModal() {
    this.showModal = false;
  }

  sendNotification() {
    if (!this.isAdminOrTeacher) return;
    this.sendError = null;
    let notif: any = {
      ...this.newNotification,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    if (this.recipientType === 'USER' && this.selectedUserId) {
      notif.userId = this.selectedUserId;
    } else if (this.recipientType === 'CLASSROOM' && this.selectedClassroomId) {
      notif.classroomId = this.selectedClassroomId;
    } else {
      this.sendError = 'Selecione um destinatário.';
      return;
    }
    this.showModal = false;
    this.notificationService.createNotification(notif).subscribe({
      next: () => {
        this.newNotification = { title: '', message: '', notificationType: 'AVISO' };
        this.selectedUserId = null;
        this.selectedClassroomId = null;
        this.notificationService.loadNotifications();
      },
      error: (err) => {
        this.sendError = err?.error || 'Erro ao enviar notificação.';
      }
    });
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  get filteredNotifications(): Notification[] {
    return this.notifications.filter(n => {
      const matchesText = this.searchText.trim() === '' ||
        (n.title?.toLowerCase().includes(this.searchText.toLowerCase()) || n.message?.toLowerCase().includes(this.searchText.toLowerCase()));
      const matchesType = this.filterType === 'ALL' || n.notificationType === this.filterType;
      const matchesRead = this.filterRead === 'ALL' || (this.filterRead === 'READ' ? n.isRead : !n.isRead);
      return matchesText && matchesType && matchesRead;
    });
  }

  getNotifTypeColor(type: string): string {
    switch (type) {
      case 'TAREFA': return 'bg-blue-600';
      case 'FORUM': return 'bg-green-600';
      case 'SISTEMA': return 'bg-gray-600';
      case 'AVISO': return 'bg-yellow-600';
      default: return 'bg-indigo-500';
    }
  }

  getNotifTypeIcon(type: string): string {
    switch (type) {
      case 'TAREFA': return 'assignment';
      case 'FORUM': return 'forum';
      case 'SISTEMA': return 'settings';
      case 'AVISO': return 'announcement';
      default: return 'notifications';
    }
  }

  getNotifTypeLabel(type: string): string {
    switch (type) {
      case 'TAREFA': return 'Tarefa';
      case 'FORUM': return 'Fórum';
      case 'SISTEMA': return 'Sistema';
      case 'AVISO': return 'Aviso';
      default: return 'Notificação';
    }
  }

  get isAdminOrTeacher(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'TEACHER';
  }
}
