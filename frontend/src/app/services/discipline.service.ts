import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Discipline {
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DisciplineService {
  private apiUrl = 'http://localhost:8080/api/disciplines';

  constructor(private http: HttpClient) {}

  getAllDisciplines(active?: boolean): Observable<Discipline[]> {
    let params = new HttpParams();
    if (active !== undefined) {
      params = params.set('active', active.toString());
    }
    return this.http.get<Discipline[]>(this.apiUrl, { params });
  }

  getDisciplineById(id: number): Observable<Discipline> {
    return this.http.get<Discipline>(`${this.apiUrl}/${id}`);
  }

  createDiscipline(discipline: { name: string; description?: string }): Observable<Discipline> {
    return this.http.post<Discipline>(this.apiUrl, discipline);
  }

  updateDiscipline(id: number, discipline: { name?: string; description?: string; isActive?: boolean }): Observable<Discipline> {
    return this.http.put<Discipline>(`${this.apiUrl}/${id}`, discipline);
  }

  deleteDiscipline(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}

