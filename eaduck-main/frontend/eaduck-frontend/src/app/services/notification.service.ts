import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(userId: number): Observable<any[]> {
    const token = localStorage.getItem('token'); // Obtém o token JWT
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`, { headers });
  }
}