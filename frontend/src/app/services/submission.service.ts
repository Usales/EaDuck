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
  grade?: number;
  feedback?: string;
  evaluatedAt?: string;
  studentName?: string;
  studentEmail?: string;
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

  getSubmissionsByTask(taskId: number): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.apiUrl}/task/${taskId}`);
  }

  evaluateSubmission(id: number, grade: number, feedback: string): Observable<Submission> {
    return this.http.put<Submission>(`${this.apiUrl}/${id}/evaluate`, { grade, feedback });
  }

  submitTask(taskId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/task/${taskId}/upload`, formData, {
      responseType: 'text'
    });
  }

  getSubmissionsByStudent(studentId: number) {
    return this.http.get<Submission[]>(`${this.apiUrl}/student/${studentId}`);
  }

  getMySubmissions() {
    return this.http.get<Submission[]>(`${this.apiUrl}/me`);
  }

  getAllSubmissions(): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.apiUrl}/all`);
  }
} 