import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { User } from './user.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap, switchMap, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = 'http://localhost:8080/api/auth';
  private userId: number | null = null;
  private TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 horas
  private TOKEN_REFRESH_MS = 23 * 60 * 60 * 1000; // 23 horas (renovar 1 hora antes de expirar)
  private lastActivity = Date.now();
  private refreshTimer: any;

  constructor(private http: HttpClient) {
    // Limpar dados antigos na inicialização
    this.clearOldAuthData();
    
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

    // Iniciar timer de renovação
    this.startRefreshTimer();

    // Monitorar atividade do usuário
    window.addEventListener('click', () => this.updateLastActivity());
    window.addEventListener('keypress', () => this.updateLastActivity());
    window.addEventListener('mousemove', () => this.updateLastActivity());
  }

  private updateLastActivity() {
    this.lastActivity = Date.now();
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('token_last_used');
    localStorage.removeItem('currentUser');
    this.userId = null;
    this.currentUserSubject.next(null);
  }

  private clearOldAuthData(): void {
    // Verificar se há dados de autenticação válidos
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('currentUser');
    
    // Se não há token, limpar tudo
    if (!token) {
      if (currentUser) {
        console.log('Token ausente, limpando dados de usuário...');
        this.clearAuthData();
      }
      return;
    }
    
    // Se há token mas não há usuário, tentar manter o token (pode ser renovado)
    if (!currentUser) {
      return;
    }
    
    // Verificar se os dados do usuário estão corrompidos
    try {
      const user = JSON.parse(currentUser);
      if (!user.email || !user.id) {
        console.log('Dados de usuário incompletos, limpando...');
        this.clearAuthData();
      }
    } catch (error) {
      console.log('Dados de usuário corrompidos, limpando...');
      this.clearAuthData();
    }
  }

  private startRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      if (!this.isAuthenticated()) {
        return; // Se não está autenticado, não faz nada
      }

      const token = this.getToken();
      if (!token) {
        this.logout();
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;
        
        // Renovar token se restam menos de 2 horas (7200 segundos)
        if (timeUntilExpiry < 7200 && timeUntilExpiry > 0) {
          console.log('Renovando token automaticamente...');
          this.refreshToken();
        } else if (timeUntilExpiry <= 0) {
          console.log('Token expirado, fazendo logout...');
          this.logout();
        }
      } catch (error) {
        console.log('Erro ao verificar expiração do token:', error);
        this.logout();
      }
    }, 300000); // Verifica a cada 5 minutos
  }

  private refreshToken() {
    const token = this.getToken();
    if (!token) {
      console.log('Nenhum token para renovar');
      return;
    }

    console.log('Tentando renovar token...');
    this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/refresh`, { token })
      .subscribe({
        next: (response) => {
          console.log('Token renovado com sucesso');
          localStorage.setItem('token', response.token);
          localStorage.setItem('token_last_used', Date.now().toString());
          this.userId = parseInt(response.userId, 10);
          this.updateLastActivity();
        },
        error: (error) => {
          console.error('Erro ao renovar token:', error);
          // Só faz logout se o erro for de autenticação (401/403)
          if (error.status === 401 || error.status === 403) {
            this.logout();
          }
        }
      });
  }

  setCurrentUser(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateCurrentUser(updatedUser: User) {
    this.setCurrentUser(updatedUser);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isCurrentUser(userId: number): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.id === userId;
  }

  login(email: string, password: string): Observable<User> {
    // Limpar tokens antigos antes do login
    this.clearAuthData();
    
    return this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        console.log('Login response:', response);
        console.log('Email do login:', email);
        localStorage.setItem('token', response.token);
        localStorage.setItem('token_last_used', Date.now().toString());
        this.userId = parseInt(response.userId, 10);
        this.updateLastActivity();
      }),
      switchMap(() => {
        // Após login bem-sucedido, obter dados completos do usuário
        return this.getProfile();
      }),
      tap(user => {
        // Definir o usuário atual após obter o perfil
        this.setCurrentUser(user);
      })
    );
  }

  register(email: string, password: string): Observable<{ token: string, userId: string }> {
    return this.http.post<{ token: string, userId: string }>(`${this.apiUrl}/register`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.userId = parseInt(response.userId, 10);
        this.updateLastActivity();
      })
    );
  }

  // Métodos para confirmação de e-mail
  sendConfirmationCode(email: string): Observable<any> {
    return this.http.post('http://localhost:8080/api/email-confirmation/send', { email });
  }

  verifyConfirmationCode(email: string, code: string): Observable<any> {
    return this.http.post('http://localhost:8080/api/email-confirmation/verify', { email, code });
  }

  resendConfirmationCode(email: string): Observable<any> {
    return this.http.post('http://localhost:8080/api/email-confirmation/resend', { email });
  }

  registerWithConfirmation(email: string, password: string, confirmationCode: string): Observable<{ token: string, userId: string, role: string }> {
    return this.http.post<{ token: string, userId: string, role: string }>(`${this.apiUrl}/register-with-confirmation`, { 
      email, 
      password, 
      confirmationCode 
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.userId = parseInt(response.userId, 10);
        this.updateLastActivity();
      })
    );
  }

  confirmResetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-reset-password`, { token, newPassword });
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    // Verificar se o token não está expirado usando a expiração real do JWT
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token JWT expirado, fazendo logout...');
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Token JWT inválido, fazendo logout...');
      this.logout();
      return false;
    }
  }

  logout() {
    this.clearAuthData();
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (token) {
      // Verificar se o token não está expirado
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
          console.log('Token expirado, removendo...');
          this.clearAuthData();
          return null;
        }
      } catch (error) {
        console.log('Token inválido, removendo...');
        this.clearAuthData();
        return null;
      }
    }
    return token;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getProfile(): Observable<User> {
    const token = this.getToken();
    if (!token) {
      return new Observable(subscriber => {
        subscriber.error('No token available');
        subscriber.complete();
      });
    }

    return this.http.get<any>('http://localhost:8080/api/users/me', {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => ({
        id: response.id,
        email: response.email,
        name: response.name, // Manter null se for null
        role: response.role,
        isActive: response.isActive,
        needsNameSetup: response.needsNameSetup,
        nomeCompleto: response.nomeCompleto,
        cpf: response.cpf,
        endereco: response.endereco,
        titulacao: response.titulacao,
        dataNascimento: response.dataNascimento,
        nomeMae: response.nomeMae,
        nomePai: response.nomePai,
        telefone: response.telefone
      })),
      tap(user => {
        // Definir o usuário atual após obter os dados completos
        this.setCurrentUser(user);
        
        // Se for ADMIN e já tiver preenchido os dados, salvar em cache
        if (user.role === 'ADMIN' && user.nomeCompleto && user.cpf && user.endereco) {
          localStorage.setItem('adminDataFilled', 'true');
        }
        
        // Se for TEACHER e já tiver preenchido os dados, salvar em cache
        if (user.role === 'TEACHER' && user.nomeCompleto && user.cpf && user.endereco && user.titulacao) {
          localStorage.setItem('teacherDataFilled', 'true');
        }
        
        // Se for STUDENT e já tiver preenchido os dados, salvar em cache
        if (user.role === 'STUDENT' && user.name && user.nomeCompleto && user.cpf && 
            user.dataNascimento && user.nomeMae && user.nomePai && user.telefone && user.endereco) {
          localStorage.setItem('studentDataFilled', 'true');
        }
      }),
      tap({
        error: (error) => console.error('Erro ao carregar perfil:', error)
      })
    );
  }

  updateUserName(name: string): Observable<any> {
    return this.http.put('http://localhost:8080/api/users/me/name', { name }, {
      headers: this.getAuthHeaders()
    });
  }

  updateUserData(userData: {
    name?: string;
    nomeCompleto: string;
    cpf: string;
    dataNascimento?: string;
    nomeMae?: string;
    nomePai?: string;
    telefone?: string;
    endereco: string;
    titulacao?: string;
  }): Observable<any> {
    return this.http.put('http://localhost:8080/api/users/me/name', userData, {
      headers: this.getAuthHeaders()
    });
  }
} 