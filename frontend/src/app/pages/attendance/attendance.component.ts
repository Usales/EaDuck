import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AttendanceService, ClassroomAttendanceInfo, Attendance, AttendanceBulk } from '../../services/attendance.service';
import { DisciplineCacheService } from '../../services/discipline-cache.service';
import { Discipline } from '../../services/discipline.service';
import { AuthService } from '../../services/auth.service';
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
  viewMode: 'register' | 'view' = 'register';
  
  // Frequência
  attendances: Attendance[] = [];
  allAttendances: Attendance[] = []; // Todas as frequências para visualização
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
  
  // Filtros para visualização
  disciplineFilter: string = '';
  studentFilter: string = '';
  
  // Histórico
  selectedStudentForHistory: number | null = null;
  studentHistory: Attendance[] = [];
  showHistoryModal = false;
  
  loading: boolean = false;
  saving: boolean = false;

  constructor(
    private attendanceService: AttendanceService,
    private disciplineCacheService: DisciplineCacheService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('AttendanceComponent: ngOnInit chamado');
    // Inicializar loading como false para mostrar conteúdo imediatamente
    this.loading = false;
    this.loadClassroomsFromCache();
    this.loadClassrooms();
    this.loadDisciplines();
    console.log('AttendanceComponent: Estado inicial - loading:', this.loading, 'classrooms:', this.classrooms.length);
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
    // Tentar sincronizar frequências em cache ao iniciar
    this.syncCachedAttendances();
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
    console.log('AttendanceComponent: Carregando salas...');
    this.loading = true;
    this.attendanceService.getClassrooms().subscribe({
      next: (classrooms) => {
        console.log('AttendanceComponent: Salas carregadas:', classrooms.length);
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
    
    // Tentar carregar do cache primeiro
    const cachedBulk = this.loadAttendanceFromCache(this.selectedClassroom.id, dateStr);
    if (cachedBulk) {
      // Aplicar dados do cache aos attendances
      this.attendances.forEach(att => {
        const cachedStudent = cachedBulk.students.find(s => s.studentId === att.studentId);
        if (cachedStudent) {
          att.status = cachedStudent.status as 'PRESENT' | 'ABSENT' | 'LATE';
          att.arrivalTime = cachedStudent.arrivalTime;
          att.observations = cachedStudent.observations;
        }
      });
      this.calculateSummary();
    }
    
    // Tentar carregar do servidor
    this.attendanceService.getAttendanceByClassroomAndDate(
      this.selectedClassroom.id, 
      dateStr
    ).subscribe({
      next: (attendances) => {
        // Se conseguiu carregar do servidor, usar esses dados (mais atualizados)
        this.attendances = attendances;
        this.calculateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar frequência do servidor:', error);
        // Se já carregou do cache, não mostrar erro
        if (!cachedBulk) {
          alert('Erro ao carregar frequência. Usando dados locais se disponíveis.');
        }
        this.loading = false;
        // Tentar sincronizar frequências em cache
        this.syncCachedAttendances();
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
    if (!this.canEditAttendance(attendance)) {
      alert('Não é possível editar frequências após 1 dia da data de registro.');
      return;
    }
    attendance.status = status;
    if (status !== 'LATE') {
      attendance.arrivalTime = undefined;
    } else if (!attendance.arrivalTime) {
      const now = new Date();
      attendance.arrivalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    this.calculateSummary();
  }

  saveAttendanceToCache(bulk: AttendanceBulk) {
    try {
      const cacheKey = `attendance_${bulk.classroomId}_${bulk.date}`;
      const cacheData = {
        bulk: bulk,
        timestamp: Date.now(),
        synced: false
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('Frequência salva no cache:', cacheKey);
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  }

  loadAttendanceFromCache(classroomId: number, date: string): AttendanceBulk | null {
    try {
      const cacheKey = `attendance_${classroomId}_${date}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Cache válido por 7 dias
        const cacheAge = Date.now() - cacheData.timestamp;
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
          console.log('Frequência carregada do cache:', cacheKey);
          return cacheData.bulk;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar do cache:', error);
    }
    return null;
  }

  markAttendanceAsSynced(classroomId: number, date: string) {
    try {
      const cacheKey = `attendance_${classroomId}_${date}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        cacheData.synced = true;
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Erro ao marcar como sincronizado:', error);
    }
  }

  syncCachedAttendances() {
    try {
      const keys = Object.keys(localStorage);
      const attendanceKeys = keys.filter(key => key.startsWith('attendance_') && !key.includes('_classrooms'));
      
      for (const key of attendanceKeys) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData = JSON.parse(cached);
            if (!cacheData.synced && cacheData.bulk) {
              // Tentar sincronizar
              this.attendanceService.saveBulkAttendance(cacheData.bulk).subscribe({
                next: () => {
                  console.log('Frequência sincronizada:', key);
                  this.markAttendanceAsSynced(cacheData.bulk.classroomId, cacheData.bulk.date);
                },
                error: (error) => {
                  console.warn('Erro ao sincronizar frequência do cache:', key, error);
                }
              });
            }
          }
        } catch (error) {
          console.error('Erro ao processar cache:', key, error);
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar caches:', error);
    }
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
    
    // Salvar no cache primeiro
    this.saveAttendanceToCache(bulk);
    
    // Tentar salvar no backend
    this.attendanceService.saveBulkAttendance(bulk).subscribe({
      next: (response) => {
        console.log('Frequência salva com sucesso:', response);
        // Marcar como sincronizado no cache
        this.markAttendanceAsSynced(bulk.classroomId, bulk.date);
        alert('Frequência salva com sucesso!');
        this.saving = false;
        this.loadAttendance(); // Recarregar para pegar IDs e confirmar salvamento
      },
      error: (error) => {
        console.error('Erro ao salvar frequência no servidor:', error);
        // Mesmo com erro, a frequência já está no cache
        alert('Frequência salva localmente! Será sincronizada quando a conexão for restabelecida.');
        this.saving = false;
        // Tentar sincronizar outras frequências em cache
        this.syncCachedAttendances();
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
    this.allAttendances = [];
    this.discipline = '';
    this.period = 'MANHA';
    this.viewMode = 'register';
    this.disciplineFilter = '';
    this.studentFilter = '';
    this.selectedStudentForHistory = null;
    this.studentHistory = [];
    this.showHistoryModal = false;
  }

  viewAttendance(classroom: ClassroomAttendanceInfo) {
    this.selectedClassroom = classroom;
    this.viewMode = 'view';
    this.loadAllAttendances();
  }

  loadAllAttendances() {
    if (!this.selectedClassroom) return;
    
    this.loading = true;
    this.attendanceService.getAttendanceByClassroom(this.selectedClassroom.id).subscribe({
      next: (attendances) => {
        // Normalizar arrivalTime para formato HH:mm se necessário
        this.allAttendances = attendances.map(att => {
          if (att.arrivalTime && att.arrivalTime.length > 5) {
            // Se vier no formato HH:mm:ss, pegar apenas HH:mm
            att.arrivalTime = att.arrivalTime.substring(0, 5);
          }
          return att;
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar frequências:', error);
        this.loading = false;
        alert('Erro ao carregar frequências');
      }
    });
  }

  get filteredAttendances(): Attendance[] {
    let filtered = this.allAttendances;
    
    if (this.disciplineFilter) {
      filtered = filtered.filter(a => a.discipline === this.disciplineFilter);
    }
    
    if (this.studentFilter) {
      filtered = filtered.filter(a => a.studentId.toString() === this.studentFilter);
    }
    
    // Ordenar por aluno e depois por data (mais recente primeiro)
    return filtered.sort((a, b) => {
      // Primeiro ordenar por ID do aluno
      if (a.studentId !== b.studentId) {
        return a.studentId - b.studentId;
      }
      // Se for o mesmo aluno, ordenar por data (mais recente primeiro)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  get uniqueDisciplines(): string[] {
    const disciplines = new Set<string>();
    this.allAttendances.forEach(a => {
      if (a.discipline) {
        disciplines.add(a.discipline);
      }
    });
    return Array.from(disciplines).sort();
  }

  get uniqueStudents(): { id: number; name: string }[] {
    const studentsMap = new Map<number, string>();
    this.allAttendances.forEach(a => {
      if (!studentsMap.has(a.studentId)) {
        studentsMap.set(a.studentId, a.studentName);
      }
    });
    return Array.from(studentsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  viewStudentHistory(studentId: number) {
    this.selectedStudentForHistory = studentId;
    this.showHistoryModal = true;
    this.loading = true;
    
    this.attendanceService.getAttendanceByStudent(
      studentId, 
      this.selectedClassroom?.id
    ).subscribe({
      next: (history) => {
        // Normalizar arrivalTime para formato HH:mm se necessário
        this.studentHistory = history.map(att => {
          if (att.arrivalTime && att.arrivalTime.length > 5) {
            att.arrivalTime = att.arrivalTime.substring(0, 5);
          }
          return att;
        }).sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar histórico:', error);
        this.loading = false;
        alert('Erro ao carregar histórico do aluno');
      }
    });
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.selectedStudentForHistory = null;
    this.studentHistory = [];
  }

  canEditAttendance(attendance: Attendance): boolean {
    if (!attendance.date) {
      // Se não tem data, verifica pela data atual
      return true;
    }
    const attendanceDate = new Date(attendance.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    attendanceDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - attendanceDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    // Permite editar no mesmo dia ou dias futuros (até 7 dias no futuro)
    return diffDays >= 0 && diffDays <= 7;
  }

  canEditCurrentDate(): boolean {
    const dateStr = this.formatDateForApi(this.currentDate);
    const attendanceDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    attendanceDate.setHours(0, 0, 0, 0);
    const diffTime = attendanceDate.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    // Permite editar hoje ou até 7 dias no futuro
    return diffDays >= 0 && diffDays <= 7;
  }

  formatDateDisplayFromString(date: string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PRESENT': return '✔';
      case 'ABSENT': return '✘';
      case 'LATE': return '⏱';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PRESENT': return 'Presente';
      case 'ABSENT': return 'Ausente';
      case 'LATE': return 'Atrasado';
      default: return '-';
    }
  }

  getStudentNameById(studentId: number | null): string {
    if (!studentId || !this.uniqueStudents || this.uniqueStudents.length === 0) {
      return 'Aluno';
    }
    const student = this.uniqueStudents.find(s => s.id === studentId);
    return student?.name || 'Aluno';
  }

  isNewStudentRow(index: number): boolean {
    if (index === 0) return true;
    const currentRow = this.filteredAttendances[index];
    const previousRow = this.filteredAttendances[index - 1];
    if (!currentRow || !previousRow) return true;
    return currentRow.studentId !== previousRow.studentId;
  }

  shouldShowStudentInfo(index: number): boolean {
    return this.isNewStudentRow(index);
  }

  canViewAttendance(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'TEACHER';
  }
}

