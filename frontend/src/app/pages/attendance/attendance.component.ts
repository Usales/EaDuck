import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AttendanceService, ClassroomAttendanceInfo, Attendance, AttendanceBulk } from '../../services/attendance.service';
import { DisciplineCacheService } from '../../services/discipline-cache.service';
import { Discipline } from '../../services/discipline.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { ClassroomService } from '../../services/classroom.service';
import { Subscription, forkJoin } from 'rxjs';

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
  viewMode: 'register' | 'view' | 'history' = 'register';
  
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
  dateFilter: string = ''; // Filtro por data
  
  // Histórico
  selectedStudentForHistory: number | null = null;
  studentHistory: Attendance[] = [];
  showHistoryModal = false;
  
  // Alunos completos para exibir nomes corretos
  allStudents: User[] = [];
  
  loading: boolean = false;
  saving: boolean = false;

  constructor(
    private attendanceService: AttendanceService,
    private disciplineCacheService: DisciplineCacheService,
    private authService: AuthService,
    private userService: UserService,
    private classroomService: ClassroomService
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
    
    // Carregar sala completa, alunos e frequências em paralelo
    forkJoin({
      classroom: this.classroomService.getClassroomById(this.selectedClassroom.id),
      attendances: this.attendanceService.getAttendanceByClassroomAndDate(
        this.selectedClassroom.id, 
        dateStr
      ),
      students: this.userService.getStudents()
    }).subscribe({
      next: ({ classroom, attendances, students }) => {
        // Armazenar alunos completos para uso posterior
        this.allStudents = students;
        
        // Obter todos os alunos da sala
        const allStudents = classroom.students || [];
        
        // Criar lista de frequências garantindo que todos os alunos apareçam
        const attendanceMap = new Map<number, Attendance>();
        
        // Mapear frequências existentes
        attendances.forEach((att: Attendance) => {
          attendanceMap.set(att.studentId, att);
        });
        
        // Criar frequências para alunos que não têm registro
        const allAttendances: Attendance[] = [];
        allStudents.forEach((student: any) => {
          const existingAttendance = attendanceMap.get(student.id);
          if (existingAttendance) {
            // Garantir que o nome do aluno está correto
            const studentObj = this.allStudents.find((s: User) => s.id === student.id);
            if (studentObj) {
              existingAttendance.studentName = this.getStudentDisplayNameFromUser(studentObj);
            } else if (!existingAttendance.studentName || existingAttendance.studentName.includes('@')) {
              existingAttendance.studentName = student.name || student.email || `Aluno ${student.id}`;
            }
            allAttendances.push(existingAttendance);
          } else {
            // Criar frequência vazia para aluno sem registro
            if (this.selectedClassroom) {
              // Buscar aluno completo para ter o nome correto
              const studentObj = this.allStudents.find((s: User) => s.id === student.id);
              const studentName = studentObj 
                ? this.getStudentDisplayNameFromUser(studentObj)
                : (student.name || student.email || `Aluno ${student.id}`);
              
              const newAttendance: Attendance = {
                classroomId: this.selectedClassroom.id,
                classroomName: this.selectedClassroom.name,
                studentId: student.id,
                studentName: studentName,
                date: dateStr,
                status: 'PRESENT', // Status padrão
                arrivalTime: undefined,
                observations: undefined,
                discipline: undefined,
                period: undefined
              };
              allAttendances.push(newAttendance);
            }
          }
        });
        
        // Tentar carregar do cache e aplicar se houver
        if (this.selectedClassroom) {
          const cachedBulk = this.loadAttendanceFromCache(this.selectedClassroom.id, dateStr);
          if (cachedBulk) {
            allAttendances.forEach(att => {
              const cachedStudent = cachedBulk.students.find((s: any) => s.studentId === att.studentId);
              if (cachedStudent) {
                att.status = cachedStudent.status as 'PRESENT' | 'ABSENT' | 'LATE';
                att.arrivalTime = cachedStudent.arrivalTime;
                att.observations = cachedStudent.observations;
              }
            });
          }
        }
        
        this.attendances = allAttendances;
        this.calculateSummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar frequência:', error);
        // Tentar carregar apenas frequências (fallback)
        this.attendanceService.getAttendanceByClassroomAndDate(
          this.selectedClassroom!.id, 
          dateStr
        ).subscribe({
          next: (attendances) => {
            this.attendances = attendances;
            this.calculateSummary();
            this.loading = false;
          },
          error: (error2) => {
            console.error('Erro ao carregar frequência do servidor:', error2);
            // Tentar carregar do cache
            const cachedBulk = this.loadAttendanceFromCache(this.selectedClassroom!.id, dateStr);
            if (cachedBulk) {
              // Criar attendances do cache
              this.userService.getStudents().subscribe({
                next: (students) => {
                  const attendanceMap = new Map<number, Attendance>();
                  students.forEach((student: User) => {
                    const cachedStudent = cachedBulk.students.find((s: any) => s.studentId === student.id);
                    if (cachedStudent) {
                      const att: Attendance = {
                        classroomId: this.selectedClassroom!.id,
                        classroomName: this.selectedClassroom!.name,
                        studentId: student.id,
                        studentName: student.nomeCompleto || student.name || student.email,
                        date: dateStr,
                        status: cachedStudent.status as 'PRESENT' | 'ABSENT' | 'LATE',
                        arrivalTime: cachedStudent.arrivalTime,
                        observations: cachedStudent.observations,
                        discipline: cachedBulk.discipline,
                        period: cachedBulk.period as 'MANHA' | 'TARDE' | 'INTEGRAL'
                      };
                      attendanceMap.set(student.id, att);
                    }
                  });
                  this.attendances = Array.from(attendanceMap.values());
                  this.calculateSummary();
                  this.loading = false;
                },
                error: () => {
                  this.loading = false;
                  alert('Erro ao carregar frequência. Verifique sua conexão.');
                }
              });
            } else {
              this.loading = false;
              alert('Erro ao carregar frequência. Verifique sua conexão.');
            }
            this.syncCachedAttendances();
          }
        });
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
    this.dateFilter = '';
    this.selectedStudentForHistory = null;
    this.studentHistory = [];
    this.showHistoryModal = false;
  }

  viewAttendance(classroom: ClassroomAttendanceInfo) {
    this.selectedClassroom = classroom;
    this.viewMode = 'view';
    this.loadAllAttendances();
  }

  viewAllStudentsHistory() {
    if (!this.selectedClassroom) return;
    this.viewMode = 'view';
    this.loadAllAttendances();
  }

  loadAllAttendances() {
    if (!this.selectedClassroom) return;
    
    this.loading = true;
    
    // Carregar alunos primeiro para ter os nomes completos
    this.userService.getStudents().subscribe({
      next: (students) => {
        this.allStudents = students;
        
        // Agora carregar frequências
        this.attendanceService.getAttendanceByClassroom(this.selectedClassroom!.id).subscribe({
          next: (attendances) => {
            // Normalizar arrivalTime para formato HH:mm se necessário
            // E atualizar studentName com o nome completo do aluno
            this.allAttendances = attendances.map(att => {
              if (att.arrivalTime && att.arrivalTime.length > 5) {
                att.arrivalTime = att.arrivalTime.substring(0, 5);
              }
              // Buscar aluno completo para ter o nome correto
              const student = this.allStudents.find(s => s.id === att.studentId);
              if (student) {
                att.studentName = this.getStudentDisplayNameFromUser(student);
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
      },
      error: (error) => {
        console.error('Erro ao carregar alunos:', error);
        // Continuar mesmo sem alunos, usar o que veio do backend
        this.attendanceService.getAttendanceByClassroom(this.selectedClassroom!.id).subscribe({
          next: (attendances) => {
            this.allAttendances = attendances.map(att => {
              if (att.arrivalTime && att.arrivalTime.length > 5) {
                att.arrivalTime = att.arrivalTime.substring(0, 5);
              }
              return att;
            });
            this.loading = false;
          },
          error: (error2) => {
            console.error('Erro ao carregar frequências:', error2);
            this.loading = false;
            alert('Erro ao carregar frequências');
          }
        });
      }
    });
  }

  get filteredAttendances(): Attendance[] {
    let filtered = this.allAttendances;
    
    if (this.disciplineFilter) {
      filtered = filtered.filter((a: Attendance) => a.discipline === this.disciplineFilter);
    }
    
    if (this.studentFilter) {
      filtered = filtered.filter((a: Attendance) => a.studentId.toString() === this.studentFilter);
    }
    
    if (this.dateFilter) {
      filtered = filtered.filter((a: Attendance) => {
        const attendanceDate = new Date(a.date);
        const filterDate = new Date(this.dateFilter);
        attendanceDate.setHours(0, 0, 0, 0);
        filterDate.setHours(0, 0, 0, 0);
        return attendanceDate.getTime() === filterDate.getTime();
      });
    }
    
    // Ordenar por aluno e depois por data (mais recente primeiro)
    return filtered.sort((a: Attendance, b: Attendance) => {
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
    this.allAttendances.forEach((a: Attendance) => {
      if (a.discipline) {
        disciplines.add(a.discipline);
      }
    });
    return Array.from(disciplines).sort();
  }

  get uniqueStudents(): { id: number; name: string }[] {
    const studentsMap = new Map<number, string>();
    this.allAttendances.forEach((a: Attendance) => {
      if (!studentsMap.has(a.studentId)) {
        studentsMap.set(a.studentId, a.studentName);
      }
    });
    return Array.from(studentsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a: { id: number; name: string }, b: { id: number; name: string }) => a.name.localeCompare(b.name));
  }

  viewStudentHistory(studentId: number) {
    this.selectedStudentForHistory = studentId;
    this.showHistoryModal = true;
    this.loading = true;
    
    this.attendanceService.getAttendanceByStudent(
      studentId, 
      this.selectedClassroom?.id
    ).subscribe({
      next: (history: Attendance[]) => {
        // Normalizar arrivalTime para formato HH:mm se necessário
        this.studentHistory = history.map((att: Attendance) => {
          if (att.arrivalTime && att.arrivalTime.length > 5) {
            att.arrivalTime = att.arrivalTime.substring(0, 5);
          }
          return att;
        }).sort((a: Attendance, b: Attendance) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
        });
        this.loading = false;
      },
      error: (error: any) => {
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

  getStudentDisplayName(studentName: string | undefined | null): string {
    if (!studentName) return '-';
    // Se já é um nome válido (não parece email), retornar como está
    if (!studentName.includes('@')) {
      return studentName.trim();
    }
    // Se parece email, tentar buscar no array de alunos
    const attendance = this.allAttendances.find((a: Attendance) => a.studentName === studentName);
    if (attendance) {
      const student = this.allStudents.find((s: User) => s.id === attendance.studentId);
      if (student) {
        return this.getStudentDisplayNameFromUser(student);
      }
    }
    // Se não encontrou, retornar o que veio (pode ser email se aluno não tem nome)
    return studentName.trim();
  }

  getStudentDisplayNameFromUser(student: User): string {
    if (!student) return '-';
    return student.nomeCompleto?.trim()
      || student.name?.trim()
      || student.email;
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

