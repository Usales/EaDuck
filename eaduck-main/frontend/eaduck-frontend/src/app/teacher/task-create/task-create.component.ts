import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4">
      <h2 class="text-2xl font-bold mb-4">Criar Nova Tarefa</h2>
      <form (ngSubmit)="createTask()">
        <div class="mb-4">
          <label for="title" class="block text-sm font-medium">Título</label>
          <input type="text" id="title" [(ngModel)]="task.title" name="title" class="border p-2 w-full" required>
        </div>
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium">Descrição</label>
          <textarea id="description" [(ngModel)]="task.description" name="description" class="border p-2 w-full"></textarea>
        </div>
        <div class="mb-4">
          <label for="dueDate" class="block text-sm font-medium">Prazo</label>
          <input type="datetime-local" id="dueDate" [(ngModel)]="task.dueDate" name="dueDate" class="border p-2 w-full">
        </div>
        <div class="mb-4">
          <label for="classroomId" class="block text-sm font-medium">Turma</label>
          <select id="classroomId" [(ngModel)]="task.classroomId" name="classroomId" class="border p-2 w-full" required>
            <option *ngFor="let classroom of classrooms" [value]="classroom.id">{{ classroom.name }}</option>
          </select>
        </div>
        <button type="submit" class="bg-blue-500 text-white p-2 rounded">Criar Tarefa</button>
      </form>
      <p *ngIf="message" class="mt-2 text-green-600">{{ message }}</p>
      <p *ngIf="error" class="mt-2 text-red-600">{{ error }}</p>
    </div>
  `,
  styles: []
})
export class TaskCreateComponent implements OnInit {
  task = { title: '', description: '', dueDate: '', classroomId: null };
  classrooms: any[] = [];
  message: string | null = null;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadClassrooms();
  }

  loadClassrooms() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8080/api/classrooms', { headers }).subscribe({
      next: (data) => this.classrooms = data,
      error: (error) => console.error('Erro ao carregar turmas:', error)
    });
  }

  createTask() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const payload = {
      title: this.task.title,
      description: this.task.description,
      dueDate: this.task.dueDate ? new Date(this.task.dueDate).toISOString() : null,
      classroomId: this.task.classroomId
    };
    this.http.post('http://localhost:8080/api/tasks', payload, { headers }).subscribe({
      next: () => {
        this.message = 'Tarefa criada com sucesso!';
        this.error = null;
        this.task = { title: '', description: '', dueDate: '', classroomId: null };
      },
      error: (error) => {
        this.error = error.error.message || 'Erro ao criar tarefa.';
        this.message = null;
      }
    });
  }
}