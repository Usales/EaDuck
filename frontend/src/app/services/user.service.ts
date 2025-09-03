import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`);
  }

  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}?role=${role}`);
  }

  createUser(user: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}`, user);
  }

  updateUserRole(id: number, role: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/role?role=${role}`, {});
  }

  updateUserStatus(id: number, isActive: boolean): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/status?isActive=${isActive}`, {});
  }

  // Adicionar métodos para ativar/desativar usuário e outros conforme necessário
} 