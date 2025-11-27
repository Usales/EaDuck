import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Task {
  id?: number;
  title: string;
  description: string;
  dueDate: string;
  classroomId: number;
  classroomName?: string;
  createdById?: number;
  createdByName?: string;
  createdAt?: string;
  type: string;
  discipline?: string;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id?: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  uploadedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = 'http://localhost:8080/api/tasks';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAllTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getTasksByClassroom(classroomId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/classroom/${classroomId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task, {
      headers: this.authService.getAuthHeaders()
    });
  }

  updateTask(id: number, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, task, {
      headers: this.authService.getAuthHeaders()
    });
  }

  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  uploadTaskAttachment(taskId: number, file: File): Observable<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<TaskAttachment>(`${this.apiUrl}/${taskId}/attachments`, formData, {
      headers: this.authService.getAuthHeaders()
    });
  }

  deleteTaskAttachment(taskId: number, attachmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${taskId}/attachments/${attachmentId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getTaskAttachments(taskId: number): Observable<TaskAttachment[]> {
    return this.http.get<TaskAttachment[]>(`${this.apiUrl}/${taskId}/attachments`, {
      headers: this.authService.getAuthHeaders()
    });
  }
} 