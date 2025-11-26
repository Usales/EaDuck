import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClassroomAttendanceInfo {
  id: number;
  name: string;
  academicYear: string;
  studentCount: number;
  teacherName: string;
}

export interface Attendance {
  id?: number;
  classroomId: number;
  classroomName?: string;
  studentId: number;
  studentName: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  arrivalTime?: string;
  observations?: string;
  discipline?: string;
  period?: 'MANHA' | 'TARDE' | 'INTEGRAL';
  teacherId?: number;
  teacherName?: string;
}

export interface AttendanceBulk {
  classroomId: number;
  date: string;
  discipline?: string;
  period?: string;
  students: {
    studentId: number;
    status: string;
    arrivalTime?: string;
    observations?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private apiUrl = 'http://localhost:8080/api/attendances';

  constructor(private http: HttpClient) {}

  getClassrooms(): Observable<ClassroomAttendanceInfo[]> {
    return this.http.get<ClassroomAttendanceInfo[]>(`${this.apiUrl}/classrooms`);
  }

  getAttendanceByClassroomAndDate(classroomId: number, date: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/classroom/${classroomId}/date/${date}`);
  }

  saveBulkAttendance(bulk: AttendanceBulk): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/bulk`, bulk);
  }

  exportToPdf(classroomId: number, date: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/classroom/${classroomId}/date/${date}/export/pdf`, {
      responseType: 'blob'
    });
  }
}

