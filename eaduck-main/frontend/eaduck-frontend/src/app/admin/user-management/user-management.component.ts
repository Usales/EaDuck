import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4">Gerenciamento de Usuários</h2>

      <!-- Formulário de Registro -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-2">Registrar Novo Usuário</h3>
        <form (ngSubmit)="registerUser()">
          <div class="mb-4">
            <label for="email" class="block text-sm font-medium">Email</label>
            <input type="email" id="email" [(ngModel)]="newUser.email" name="email" class="border p-2 w-full" required>
          </div>
          <div class="mb-4">
            <label for="password" class="block text-sm font-medium">Senha</label>
            <input type="password" id="password" [(ngModel)]="newUser.password" name="password" class="border p-2 w-full" required>
          </div>
          <div class="mb-4">
            <label for="role" class="block text-sm font-medium">Tipo de Usuário</label>
            <select id="role" [(ngModel)]="newUser.role" name="role" class="border p-2 w-full" required>
              <option value="STUDENT">Estudante</option>
              <option value="TEACHER">Professor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" class="bg-blue-500 text-white p-2 rounded">Registrar</button>
        </form>
        <p *ngIf="registerMessage" class="mt-2 text-green-600">{{ registerMessage }}</p>
        <p *ngIf="registerError" class="mt-2 text-red-600">{{ registerError }}</p>
      </div>

      <!-- Formulário de Ativação -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-2">Ativar/Desativar Usuário</h3>
        <form (ngSubmit)="activateUser()">
          <div class="mb-4">
            <label for="userId" class="block text-sm font-medium">ID do Usuário</label>
            <input type="number" id="userId" [(ngModel)]="activation.userId" name="userId" class="border p-2 w-full" required>
          </div>
          <div class="mb-4">
            <label for="isActive" class="block text-sm font-medium">Ativo</label>
            <input type="checkbox" id="isActive" [(ngModel)]="activation.isActive" name="isActive">
          </div>
          <div class="mb-4">
            <label for="activationRole" class="block text-sm font-medium">Tipo de Usuário</label>
            <select id="activationRole" [(ngModel)]="activation.role" name="role" class="border p-2 w-full" required>
              <option value="STUDENT">Estudante</option>
              <option value="TEACHER">Professor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" class="bg-green-500 text-white p-2 rounded">Ativar/Atualizar</button>
        </form>
        <p *ngIf="activationMessage" class="mt-2 text-green-600">{{ activationMessage }}</p>
        <p *ngIf="activationError" class="mt-2 text-red-600">{{ activationError }}</p>
      </div>

      <!-- Atribuição de Professor -->
      <div>
        <h3 class="text-xl font-semibold mb-2">Atribuir Professor à Turma</h3>
        <form (ngSubmit)="assignTeacher()">
          <div class="mb-4">
            <label for="teacherId" class="block text-sm font-medium">Professor</label>
            <select id="teacherId" [(ngModel)]="assignment.teacherId" name="teacherId" class="border p-2 w-full" required>
              <option *ngFor="let teacher of teachers" [value]="teacher.id">{{ teacher.email }}</option>
            </select>
          </div>
          <div class="mb-4">
            <label for="classroomId" class="block text-sm font-medium">Turma</label>
            <select id="classroomId" [(ngModel)]="assignment.classroomId" name="classroomId" class="border p-2 w-full" required>
              <option *ngFor="let classroom of classrooms" [value]="classroom.id">{{ classroom.name }}</option>
            </select>
          </div>
          <button type="submit" class="bg-purple-500 text-white p-2 rounded">Atribuir Professor</button>
        </form>
        <p *ngIf="assignmentMessage" class="mt-2 text-green-600">{{ assignmentMessage }}</p>
        <p *ngIf="assignmentError" class="mt-2 text-red-600">{{ assignmentError }}</p>
      </div>
    </div>
  `,
  styles: []
})
export class UserManagementComponent implements OnInit {
  newUser = { email: '', password: '', role: 'STUDENT' };
  activation = { userId: null, isActive: false, role: 'STUDENT' };
  assignment = { classroomId: null, teacherId: null };
  registerMessage: string | null = null;
  registerError: string | null = null;
  activationMessage: string | null = null;
  activationError: string | null = null;
  assignmentMessage: string | null = null;
  assignmentError: string | null = null;
  teachers: any[] = [];
  classrooms: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTeachers();
    this.loadClassrooms();
  }

  loadTeachers() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8080/api/users?role=TEACHER', { headers }).subscribe({
      next: (data) => this.teachers = data,
      error: (error) => console.error('Erro ao carregar professores:', error)
    });
  }

  loadClassrooms() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8080/api/classrooms', { headers }).subscribe({
      next: (data) => this.classrooms = data,
      error: (error) => console.error('Erro ao carregar turmas:', error)
    });
  }

  registerUser() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post('http://localhost:8080/api/auth/register', this.newUser, { headers }).subscribe({
      next: (response: any) => {
        this.registerMessage = 'Usuário registrado com sucesso!';
        this.registerError = null;
        this.newUser = { email: '', password: '', role: 'STUDENT' };
      },
      error: (error) => {
        this.registerError = error.error.message || 'Erro ao registrar usuário.';
        this.registerMessage = null;
      }
    });
  }

  activateUser() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post('http://localhost:8080/api/auth/activate', this.activation, { headers }).subscribe({
      next: (response: any) => {
        this.activationMessage = response.message || 'Usuário atualizado com sucesso!';
        this.activationError = null;
        this.activation = { userId: null, isActive: false, role: 'STUDENT' };
      },
      error: (error) => {
        this.activationError = error.error.message || 'Erro ao ativar usuário.';
        this.activationMessage = null;
      }
    });
  }

  assignTeacher() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.post(`http://localhost:8080/api/classrooms/${this.assignment.classroomId}/assign-teacher/${this.assignment.teacherId}`, {}, { headers }).subscribe({
      next: (response: any) => {
        this.assignmentMessage = response || 'Professor atribuído com sucesso!';
        this.assignmentError = null;
        this.assignment = { classroomId: null, teacherId: null };
      },
      error: (error) => {
        this.assignmentError = error.error || 'Erro ao atribuir professor.';
        this.assignmentMessage = null;
      }
    });
  }
}