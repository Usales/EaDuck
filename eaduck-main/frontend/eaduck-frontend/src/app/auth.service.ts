// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  registerStudent(email: string, name: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/auth/register-student`, {
      email,
      name,
      password,
      role: 'student',
      isActive: false
    });
  }

  activateStudent(studentId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/auth/activate-student/${studentId}`, { isActive: true });
  }

  getStudents(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/students`);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  logout(): void {
    this.currentUserSubject.next(null);
  }

  updateUser(updatedUser: User): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/users/${updatedUser.id}`, updatedUser).pipe(
      tap(() => {
        if (this.getCurrentUser()?.id === updatedUser.id) {
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }
}