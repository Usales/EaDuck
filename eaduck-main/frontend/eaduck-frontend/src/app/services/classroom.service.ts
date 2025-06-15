import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Classroom {
  id: number;
  name: string;
  academicYear: string;
  teacher: any;
  createdAt: string;
  students: any[];
}

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private apiUrl = 'http://localhost:8080/api/classrooms';

  constructor(private http: HttpClient) {}

  getAllClassrooms(): Observable<Classroom[]> {
    return this.http.get<Classroom[]>(`${this.apiUrl}`);
  }

  createClassroom(classroom: Partial<Classroom>): Observable<Classroom> {
    return this.http.post<Classroom>(`${this.apiUrl}`, classroom);
  }

  updateClassroom(id: number, classroom: Partial<Classroom>): Observable<Classroom> {
    return this.http.put<Classroom>(`${this.apiUrl}/${id}`, classroom);
  }

  deleteClassroom(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getMyClassrooms(): Observable<Classroom[]> {
    return this.http.get<Classroom[]>('http://localhost:8080/api/users/me/classrooms');
  }

  // Métodos para adicionar/remover alunos e atribuir professor podem ser adicionados aqui
} 