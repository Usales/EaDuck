import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private userId: number | null = null;
  private TOKEN_EXPIRATION_MS = 2 * 60 * 60 * 1000; // 2 horas

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<{ token: string, userId: string }> {
    return this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('token_last_used', Date.now().toString());
        this.userId = parseInt(response.userId, 10);
      })
    );
  }

  register(email: string, password: string): Observable<{ token: string, userId: string }> {
    return this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/register`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.userId = parseInt(response.userId, 10);
      })
    );
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { email });
  }

  confirmResetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-reset-password`, { token, newPassword });
  }

  validateToken(token: string): Observable<boolean> {
    // Checa expiração por inatividade
    const lastUsed = localStorage.getItem('token_last_used');
    if (lastUsed && Date.now() - parseInt(lastUsed, 10) > this.TOKEN_EXPIRATION_MS) {
      localStorage.removeItem('token');
      localStorage.removeItem('token_last_used');
      this.userId = null;
      return of(false);
    }
    // Atualiza timestamp de uso
    localStorage.setItem('token_last_used', Date.now().toString());
    return this.http.post<boolean>(`${this.apiUrl}/validate-token`, { token }).pipe(
      map(response => response === true),
      catchError(error => {
        console.error('Erro ao validar token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('token_last_used');
        this.userId = null;
        return of(false);
      })
    );
  }

  isAuthenticated(): Observable<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      this.userId = null;
      return of(false);
    }
    return this.validateToken(token);
  }

  getUserId(): number | null {
    return this.userId;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('token_last_used');
    this.userId = null;
  }
}