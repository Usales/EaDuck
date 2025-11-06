import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (isAuthenticated) {
      return of(true);
    }
    
    // Remove o token se não autenticado
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
    return of(false);
  }
}