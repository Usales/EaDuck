import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AttendanceService, ClassroomAttendanceInfo, Attendance, AttendanceBulk } from '../../services/attendance.service';
import { DisciplineCacheService } from '../../services/discipline-cache.service';
import { Discipline } from '../../services/discipline.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent implements OnInit, OnDestroy {
  // Lista de salas
  classrooms: ClassroomAttendanceInfo[] = [];
  selectedClassroom: ClassroomAttendanceInfo | null = null;
  
  // Frequência
  attendances: Attendance[] = [];
  currentDate: Date = new Date();
  
  // Formulário
  discipline: string = '';
  period: 'MANHA' | 'TARDE' | 'INTEGRAL' = 'MANHA';
  
  // Disciplinas
  disciplines: Discipline[] = [];
  loadingDisciplines = false;
  private disciplinesSubscription?: Subscription;
  
  // Resumo
  totalStudents: number = 0;
  presentCount: number = 0;
  absentCount: number = 0;
  lateCount: number = 0;
  attendancePercentage: number = 0;
  
  loading: boolean = false;
  saving: boolean = false;

  constructor(
    private attendanceService: AttendanceService,
    private disciplineCacheService: DisciplineCacheService
  ) {}

  ngOnInit() {
    this.loadClassroomsFromCache();
    this.loadClassrooms();
    this.loadDisciplines();
    // Escutar mudanças no cache de disciplinas para sincronização automática
    this.disciplinesSubscription = this.disciplineCacheService.disciplines$.subscribe({
      next: (disciplines) => {
        this.disciplines = disciplines;
        this.loadingDisciplines = false;
      },
      error: (error) => {
        console.error('Erro ao sincronizar disciplinas:', error);
        this.loadingDisciplines = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.disciplinesSubscription) {
      this.disciplinesSubscription.unsubscribe();
    }
  }

  loadDisciplines() {
    this.loadingDisciplines = true;
    // Carregar do cache (que faz a requisição se necessário)
    this.disciplineCacheService.loadDisciplines();
    // Obter lista atual do cache
    this.disciplines = this.disciplineCacheService.getDisciplines();
    if (this.disciplines.length > 0) {
      this.loadingDisciplines = false;
    }
  }

  loadClassroomsFromCache() {
    try {
      const cached = localStorage.getItem('attendance_classrooms');
      if (cached) {
        const cachedData = JSON.parse(cached);
        const cacheTime = cachedData.timestamp || 0;
        const now = Date.now();
        // Cache válido por 5 minutos
        if (now - cacheTime < 5 * 60 * 1000) {
          this.classrooms = cachedData.classrooms || [];
          if (this.classrooms.length > 0) {
            console.log('Salas carregadas do cache');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
  }

  saveClassroomsToCache(classrooms: ClassroomAttendanceInfo[]) {
    try {
      const cacheData = {
        classrooms: classrooms,
        timestamp: Date.now()
      };
      localStorage.setItem('attendance_classrooms', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  loadClassrooms() {
    this.loading = true;
    this.attendanceService.getClassrooms().subscribe({
      next: (classrooms) => {
        this.classrooms = classrooms;
        this.saveClassroomsToCache(classrooms);
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar salas:', error);
        this.loading = false;
        // Se não há cache, mostra erro
        if (this.classrooms.length === 0) {
          alert('Erro ao carregar salas. Verifique sua conexão.');
        }
      }
    });
  }

  selectClassroom(classroom: ClassroomAttendanceInfo) {
    this.selectedClassroom = classroom;
    this.loadAttendance();
  }

  loadAttendance() {
    if (!this.selectedClassroom) return;
    
    this.loading = true;
    const dateStr = this.formatDateForApi(this.currentDate);
    
    this.attendanceService.getAttendanceByClassroomAndDate(
      this.selectedClassroom.id, 
      dateStr
    ).subscribe({
      next: (attendances) => {
        this.attendances = attendances;
        this.calculateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar frequência:', error);
        this.loading = false;
        alert('Erro ao carregar frequência');
      }
    });
  }

  previousDay() {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() - 1);
    this.currentDate = newDate;
    if (this.selectedClassroom) {
      this.loadAttendance();
    }
  }

  nextDay() {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + 1);
    this.currentDate = newDate;
    if (this.selectedClassroom) {
      this.loadAttendance();
    }
  }

  onDateChange(event: any) {
    const dateStr = event.target.value;
    if (dateStr) {
      this.currentDate = new Date(dateStr);
      if (this.selectedClassroom) {
        this.loadAttendance();
      }
    }
  }

  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getDateInputValue(): string {
    const year = this.currentDate.getFullYear();
    const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  updateAttendanceStatus(attendance: Attendance, status: 'PRESENT' | 'ABSENT' | 'LATE') {
    attendance.status = status;
    if (status !== 'LATE') {
      attendance.arrivalTime = undefined;
    } else if (!attendance.arrivalTime) {
      const now = new Date();
      attendance.arrivalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    this.calculateSummary();
  }

  saveAttendance() {
    if (!this.selectedClassroom) return;
    
    this.saving = true;
    
    // Validar que todos os alunos têm status definido
    const studentsWithStatus = this.attendances.map(att => {
      if (!att.status) {
        console.warn('Aluno sem status definido:', att.studentName);
        // Se não tem status, definir como PRESENT por padrão
        att.status = 'PRESENT';
      }
      return {
        studentId: att.studentId,
        status: att.status.toUpperCase(), // Garantir maiúsculas
        arrivalTime: att.arrivalTime || undefined,
        observations: att.observations || undefined
      };
    });
    
    const bulk: AttendanceBulk = {
      classroomId: this.selectedClassroom.id,
      date: this.formatDateForApi(this.currentDate),
      discipline: this.discipline || undefined,
      period: this.period,
      students: studentsWithStatus
    };

    console.log('Salvando frequência:', bulk);
    
    this.attendanceService.saveBulkAttendance(bulk).subscribe({
      next: (response) => {
        console.log('Frequência salva com sucesso:', response);
        alert('Frequência salva com sucesso!');
        this.saving = false;
        this.loadAttendance(); // Recarregar para pegar IDs e confirmar salvamento
      },
      error: (error) => {
        console.error('Erro ao salvar frequência:', error);
        alert('Erro ao salvar frequência: ' + (error.error?.message || error.error?.error || 'Erro desconhecido'));
        this.saving = false;
      }
    });
  }

  exportToPdf() {
    if (!this.selectedClassroom) return;
    
    const dateStr = this.formatDateForApi(this.currentDate);
    this.attendanceService.exportToPdf(this.selectedClassroom.id, dateStr).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `frequencia_${this.selectedClassroom!.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr.replace(/-/g, '')}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + (error.error?.message || 'Erro desconhecido'));
      }
    });
  }

  calculateSummary() {
    this.totalStudents = this.attendances.length;
    this.presentCount = this.attendances.filter(a => a.status === 'PRESENT').length;
    this.absentCount = this.attendances.filter(a => a.status === 'ABSENT').length;
    this.lateCount = this.attendances.filter(a => a.status === 'LATE').length;
    this.attendancePercentage = this.totalStudents > 0 
      ? (this.presentCount * 100 / this.totalStudents) 
      : 0;
  }

  backToClassrooms() {
    this.selectedClassroom = null;
    this.attendances = [];
    this.discipline = '';
    this.period = 'MANHA';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PRESENT': return '✔';
      case 'ABSENT': return '✘';
      case 'LATE': return '⏱';
      default: return '';
    }
  }
}

