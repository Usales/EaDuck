import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      map(isAuthenticated => {
        if (isAuthenticated) {
          return true;
        }
        // Remove o token se não autenticado
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
        return false;
      }),
      catchError(error => {
        console.error('Erro no AuthGuard:', error);
        // Remove o token e redireciona em caso de erro
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}