import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Submission {
  id: number;
  taskId: number;
  studentId: number;
  content: string;
  fileUrl?: string;
  submittedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private apiUrl = 'http://localhost:8080/api/submissions';

  constructor(private http: HttpClient) {}

  updateSubmission(id: number, submission: Partial<Submission>): Observable<Submission> {
    return this.http.put<Submission>(`${this.apiUrl}/${id}`, submission);
  }

  deleteSubmission(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
} 