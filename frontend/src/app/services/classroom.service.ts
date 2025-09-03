import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Classroom {
  id: number;
  name: string;
  academicYear: string;
  teachers?: any[];
  createdAt: string;
  students?: any[];
  teacherNames?: string[];
  studentCount?: number;
}

@Injectable({ providedIn: 'root' })
export class ClassroomService {
  private apiUrl = 'http://localhost:8080/api/classrooms';

  constructor(private http: HttpClient) {}

  getAllClassrooms(): Observable<Classroom[]> {
    return this.http.get<any[]>(`${this.apiUrl}`).pipe(
      map(classrooms => classrooms.map(c => ({
        ...c,
        teachers: c.teacherIds && c.teacherNames ? c.teacherIds.map((id: number, idx: number) => ({
          id,
          email: c.teacherNames[idx]
        })) : [],
        students: c.studentIds && c.studentNames ? c.studentIds.map((id: number, idx: number) => ({
          id,
          email: c.studentNames[idx]
        })) : []
      })))
    );
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

  assignTeacher(classroomId: number, teacherId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classroomId}/assign-teacher/${teacherId}`, {});
  }

  addTeacher(classroomId: number, teacherId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classroomId}/assign-teacher/${teacherId}`, {});
  }

  removeTeacher(classroomId: number, teacherId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${classroomId}/remove-teacher/${teacherId}`);
  }

  addStudent(classroomId: number, studentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${classroomId}/students/${studentId}`, {});
  }

  removeStudent(classroomId: number, studentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${classroomId}/remove-student/${studentId}`);
  }

  getClassroomById(id: number): Observable<Classroom> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(c => ({
        ...c,
        teachers: c.teacherIds && c.teacherNames ? c.teacherIds.map((id: number, idx: number) => ({
          id,
          email: c.teacherNames[idx]
        })) : [],
        students: c.studentIds && c.studentNames ? c.studentIds.map((id: number, idx: number) => ({
          id,
          email: c.studentNames[idx],
          name: c.studentNames[idx]
        })) : []
      }))
    );
  }

  // Métodos para adicionar/remover alunos e atribuir professor podem ser adicionados aqui
} 