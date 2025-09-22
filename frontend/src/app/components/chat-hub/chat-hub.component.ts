import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { CreateChatModalComponent } from '../create-chat-modal/create-chat-modal.component';
import { ClassroomSettingsModalComponent } from '../classroom-settings-modal/classroom-settings-modal.component';

export interface ClassroomChat {
  id: number;
  name: string;
  academicYear: string;
  teacherNames: string[];
  studentNames: string[];
  studentCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isActive: boolean;
}

export interface Student {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

@Component({
  selector: 'app-chat-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateChatModalComponent, ClassroomSettingsModalComponent],
  templateUrl: './chat-hub.component.html',
  styleUrls: ['./chat-hub.component.scss']
})
export class ChatHubComponent implements OnInit, OnDestroy {
  classrooms: ClassroomChat[] = [];
  filteredClassrooms: ClassroomChat[] = [];
  searchTerm = '';
  isLoading = false;
  currentUser: any = null;
  isAdmin = false;
  
  // Filtros avançados
  selectedYear = '';
  selectedTeacher = '';
  selectedStudent = '';
  sortBy = 'name'; // name, year, students, lastMessage
  sortOrder = 'asc'; // asc, desc
  showOnlyActive = false;
  
  // Opções para filtros
  availableYears: string[] = [];
  availableTeachers: string[] = [];
  availableStudents: Student[] = [];
  
  // Modal de criação
  showCreateModal = false;
  
  // Modal de configurações
  showSettingsModal = false;
  selectedClassroom: ClassroomChat | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadClassrooms();
    this.loadStudents();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  loadCurrentUser() {
    this.authService.currentUser$.subscribe({
      next: (user: any) => {
        this.currentUser = user;
        this.isAdmin = user?.role === 'ADMIN';
      },
      error: (error: any) => {
        console.error('Erro ao carregar usuário:', error);
      }
    });
  }

  loadClassrooms() {
    this.isLoading = true;
    
    if (this.isAdmin) {
      // Admin vê todas as salas
      this.http.get<any[]>('http://localhost:8080/api/classrooms').subscribe({
        next: (classrooms) => {
          this.classrooms = classrooms.map(classroom => ({
            id: classroom.id,
            name: classroom.name,
            academicYear: classroom.academicYear,
            teacherNames: classroom.teacherNames || [],
            studentNames: classroom.studentNames || [],
            studentCount: classroom.studentCount || 0,
            unreadCount: 0,
            isActive: classroom.isActive !== undefined ? classroom.isActive : true
          }));
          this.extractFilterOptions();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar salas:', error);
          this.isLoading = false;
        }
      });
    } else {
      // Usuário comum vê apenas suas salas
      this.http.get<any[]>(`http://localhost:8080/api/classrooms/user/${this.currentUser?.id}`).subscribe({
        next: (classrooms) => {
          this.classrooms = classrooms.map(classroom => ({
            id: classroom.id,
            name: classroom.name,
            academicYear: classroom.academicYear,
            teacherNames: classroom.teacherNames || [],
            studentNames: classroom.studentNames || [],
            studentCount: classroom.studentCount || 0,
            unreadCount: 0,
            isActive: classroom.isActive !== undefined ? classroom.isActive : true
          }));
          this.extractFilterOptions();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar salas do usuário:', error);
          this.isLoading = false;
        }
      });
    }
  }

  loadStudents() {
    this.http.get<Student[]>('http://localhost:8080/api/users/students').subscribe({
      next: (students) => {
        this.availableStudents = students.filter(student => student.isActive);
      },
      error: (error) => {
        console.error('Erro ao carregar alunos:', error);
      }
    });
  }


  openChat(classroom: ClassroomChat) {
    // Navegar para o chat da sala específica
    this.router.navigate(['/chat'], { 
      queryParams: { 
        classroomId: classroom.id,
        classroomName: classroom.name 
      } 
    });
  }

  createNewChat() {
    this.showCreateModal = true;
  }

  onChatCreated(newChat: any) {
    console.log('Nova sala criada:', newChat);
    // Recarregar a lista de salas
    this.loadClassrooms();
    this.showCreateModal = false;
  }

  onCloseCreateModal() {
    this.showCreateModal = false;
  }

  // Métodos para filtros avançados
  extractFilterOptions() {
    // Extrair anos únicos
    this.availableYears = [...new Set(this.classrooms.map(c => c.academicYear))].sort();
    
    // Extrair professores únicos
    const allTeachers = this.classrooms.flatMap(c => c.teacherNames);
    this.availableTeachers = [...new Set(allTeachers)].sort();
  }

  applyFilters() {
    let filtered = [...this.classrooms];

    // Filtro por termo de busca
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(classroom => 
        classroom.name.toLowerCase().includes(term) ||
        classroom.academicYear.toLowerCase().includes(term) ||
        classroom.teacherNames.some(teacher => teacher.toLowerCase().includes(term)) ||
        classroom.studentNames.some(student => student.toLowerCase().includes(term))
      );
    }

    // Filtro por ano
    if (this.selectedYear) {
      filtered = filtered.filter(classroom => classroom.academicYear === this.selectedYear);
    }

    // Filtro por professor
    if (this.selectedTeacher) {
      filtered = filtered.filter(classroom => 
        classroom.teacherNames.includes(this.selectedTeacher)
      );
    }

    // Filtro por aluno
    if (this.selectedStudent) {
      filtered = filtered.filter(classroom => 
        classroom.studentNames.includes(this.selectedStudent)
      );
    }

    // Filtro por salas ativas (com estudantes)
    if (this.showOnlyActive) {
      filtered = filtered.filter(classroom => classroom.studentCount > 0);
    }

    // Filtro por status ativo/inativo baseado no campo isActive
    // Se for ADMIN, mostrar todas as salas
    // Se for TEACHER, mostrar apenas salas ativas ou salas que ele criou
    // Se for STUDENT, mostrar apenas salas ativas
    if (this.currentUser?.role === 'ADMIN') {
      // Admin vê todas as salas
    } else if (this.currentUser?.role === 'TEACHER') {
      // Professor vê salas ativas ou salas que ele criou (mesmo inativas)
      filtered = filtered.filter(classroom => 
        classroom.isActive || this.isClassroomCreator(classroom)
      );
    } else {
      // Estudante vê apenas salas ativas
      filtered = filtered.filter(classroom => classroom.isActive !== false);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'year':
          comparison = a.academicYear.localeCompare(b.academicYear);
          break;
        case 'students':
          comparison = a.studentCount - b.studentCount;
          break;
        case 'lastMessage':
          comparison = (a.lastMessageTime?.getTime() || 0) - (b.lastMessageTime?.getTime() || 0);
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    this.filteredClassrooms = filtered;
  }

  onSearchChange() {
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedYear = '';
    this.selectedTeacher = '';
    this.selectedStudent = '';
    this.showOnlyActive = false;
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.applyFilters();
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  getThemeClass(): string {
    return this.isDarkMode() ? 'dark' : 'light';
  }

  // Métodos para o modal de configurações
  openSettings(event: Event, classroom: ClassroomChat) {
    event.stopPropagation(); // Evita abrir o chat ao clicar no botão
    this.selectedClassroom = classroom;
    this.showSettingsModal = true;
  }

  onCloseSettings() {
    this.showSettingsModal = false;
    this.selectedClassroom = null;
  }

  onClassroomUpdated(updatedClassroom: any) {
    // Atualiza a sala na lista local
    const index = this.classrooms.findIndex(c => c.id === updatedClassroom.id);
    if (index !== -1) {
      this.classrooms[index] = {
        ...this.classrooms[index],
        name: updatedClassroom.name,
        academicYear: updatedClassroom.academicYear,
        isActive: updatedClassroom.isActive
      };
      this.applyFilters(); // Reaplica os filtros
    }
  }

  private isClassroomCreator(classroom: ClassroomChat): boolean {
    // Verifica se o usuário atual é um dos professores da sala
    if (!this.currentUser || !classroom.teacherNames || classroom.teacherNames.length === 0) {
      return false;
    }
    
    // Verifica se o usuário atual está na lista de professores
    return classroom.teacherNames.some(teacher => 
      teacher === this.currentUser.name || teacher === this.currentUser.email
    );
  }
}
