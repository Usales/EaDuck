import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from './user.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = 'http://localhost:8080/api/auth';
  private userId: number | null = null;
  private TOKEN_EXPIRATION_MS = 2 * 60 * 60 * 1000; // 2 horas

  constructor(private http: HttpClient) {
    // Recupera o usuário do localStorage ao iniciar
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    } else if (this.isAuthenticated()) {
      // Se não há usuário armazenado mas há um token válido, carrega o perfil
      this.getProfile().subscribe({
        next: (user) => {
          this.setCurrentUser(user);
        },
        error: (error) => {
          console.error('Erro ao carregar perfil do usuário:', error);
          this.logout(); // Se não conseguir carregar o perfil, faz logout
        }
      });
    }
  }

  setCurrentUser(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isCurrentUser(userId: number): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.id === userId;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('token_last_used', Date.now().toString());
        this.userId = parseInt(response.userId, 10);
      }),
      switchMap(() => this.getProfile()),
      tap(user => {
        this.setCurrentUser(user);
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

  confirmResetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-reset-password`, { token, newPassword });
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const lastUsed = localStorage.getItem('token_last_used');
    
    if (!token || !lastUsed) {
      return false;
    }

    const now = Date.now();
    const lastUsedTime = parseInt(lastUsed, 10);
    
    if (now - lastUsedTime > this.TOKEN_EXPIRATION_MS) {
      this.logout();
      return false;
    }

    return true;
  }

  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('token_last_used');
    this.currentUserSubject.next(null);
    this.userId = null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getProfile(): Observable<User> {
    const token = this.getToken();
    if (!token) {
      return new Observable(subscriber => {
        subscriber.error('No token available');
        subscriber.complete();
      });
    }

    return this.http.get<User>('http://localhost:8080/api/users/me').pipe(
      tap({
        error: (error) => console.error('Erro ao carregar perfil:', error)
      })
    );
  }
} 