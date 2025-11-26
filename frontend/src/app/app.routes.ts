import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { HomeComponent } from './pages/home/home.component';
import { UsersComponent } from './pages/users/users.component';
import { ClassroomsComponent } from './pages/classrooms/classrooms.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { AuthGuard } from './auth.guard';
import { ConfirmResetPasswordComponent } from './pages/confirm-reset-password/confirm-reset-password.component';
import { ChatComponent } from './pages/chat/chat.component';
import { ChatHubComponent } from './components/chat-hub/chat-hub.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AttendanceComponent } from './pages/attendance/attendance.component';
import { DisciplinesComponent } from './pages/disciplines/disciplines.component';
import { EditGradesComponent } from './pages/edit-grades/edit-grades.component';
// import { DashboardComponent } from './pages/dashboard/dashboard.component'; // será criado

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UsersComponent, canActivate: [AuthGuard] },
  { path: 'classrooms', component: ClassroomsComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [AuthGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
  { path: 'chat-hub', component: ChatHubComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'attendance', component: AttendanceComponent, canActivate: [AuthGuard] },
  { path: 'disciplines', component: DisciplinesComponent, canActivate: [AuthGuard] },
  { path: 'edit-grades/:id', component: EditGradesComponent, canActivate: [AuthGuard] },
  { path: 'confirm-reset-password', component: ConfirmResetPasswordComponent },
  { path: '**', redirectTo: '/login' }
  // { path: 'dashboard', component: DashboardComponent },
];