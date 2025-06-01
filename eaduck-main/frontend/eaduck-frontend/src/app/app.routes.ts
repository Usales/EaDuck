import { Routes } from '@angular/router';
import { TaskCreateComponent } from './teacher/task-create/task-create.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { LoginComponent } from './login/login.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ConfirmResetPasswordComponent } from './confirm-reset-password/confirm-reset-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { RegisterComponent } from './register/register.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'admin/users', component: UserManagementComponent },
  { path: 'teacher/tasks/create', component: TaskCreateComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'confirm-reset-password', component: ConfirmResetPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'register', component: RegisterComponent },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] }
];