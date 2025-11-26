import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Observable, forkJoin } from 'rxjs';
import { User } from '../../services/user.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-classrooms',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: './classrooms.component.html',
  styleUrl: './classrooms.component.scss'
})
export class ClassroomsComponent implements OnInit {
  classrooms: Classroom[] = [];
  filteredClassrooms: Classroom[] = [];
  filter = '';
  editClassroomId: number | null = null;
  editName = '';
  editAcademicYear = '';

  newName = '';
  newAcademicYear = '';
  showNewClassroomForm = false;

  currentUser$: Observable<User | null>;
  currentUser: User | null = null;
  teachers: User[] = [];
  selectedTeacherIds: number[] = [];
  searchTeacher = '';
  filteredTeachers: User[] = [];
  assignClassroomId: number | null = null;

  students: User[] = [];
  selectedStudentIds: number[] = [];
  searchStudent = '';
  filteredStudents: User[] = [];
  assignMode: 'teacher' | 'student' | null = null;

  showNotasPdfModal = false;
  notasPdfClassroom: Classroom | null = null;
  notasPdfSearch = '';
  filteredNotasPdfStudents: User[] = [];

  @ViewChild('teacherSearchInput') teacherSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('studentSearchInput') studentSearchInput?: ElementRef<HTMLInputElement>;

  constructor(
    private classroomService: ClassroomService, 
    private authService: AuthService, 
    private userService: UserService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  deleteClassroom(classroom: Classroom) {
    this.classroomService.deleteClassroom(classroom.id).subscribe(() => {
      this.classrooms = this.classrooms.filter(c => c.id !== classroom.id);
      this.applyFilter();
    });
  }

  createClassroom() {
    if (!this.newName || !this.newAcademicYear) return;
    const classroomData: any = {
      name: this.newName,
      academicYear: this.newAcademicYear
    };
    if (this.selectedTeacherIds && this.selectedTeacherIds.length > 0) {
      classroomData.teachers = this.selectedTeacherIds.map(id => ({ id }));
    }
    this.classroomService.createClassroom(classroomData).subscribe(newClass => {
      this.classrooms.push(newClass);
      this.applyFilter();
      this.newName = '';
      this.newAcademicYear = '';
      this.selectedTeacherIds = [];
      this.showNewClassroomForm = false;
    });
  }

  toggleNewClassroomForm() {
    this.showNewClassroomForm = !this.showNewClassroomForm;
    if (!this.showNewClassroomForm) {
      this.newName = '';
      this.newAcademicYear = '';
    }
  }

  ngOnInit() {
    // Subscribe to current user changes
    this.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user?.role === 'ADMIN' || user?.role === 'TEACHER') {
        this.loadClassrooms();
      } else {
        this.classroomService.getMyClassrooms().subscribe(classrooms => {
          this.classrooms = classrooms;
          this.applyFilter();
        });
      }
      if (user?.role === 'ADMIN') {
        this.loadTeachers();
        this.loadStudents();
      } else if (user?.role === 'TEACHER') {
        this.loadStudents();
      }
    });
  }

  loadClassrooms() {
    this.classroomService.getAllClassrooms().subscribe(classrooms => {
      this.classrooms = classrooms;
      this.applyFilter();
    });
  }

  applyFilter() {
    const f = this.filter.toLowerCase();
    this.filteredClassrooms = this.classrooms.filter(c => {
      // Filtrar por texto de busca
      const matchesSearch = c.name.toLowerCase().includes(f) ||
        (c.academicYear || '').toLowerCase().includes(f);
      
      // Filtrar por status ativo/inativo
      // Se for ADMIN, mostrar todas as salas
      // Se for TEACHER, mostrar apenas salas ativas ou salas que ele criou
      // Se for STUDENT, mostrar apenas salas ativas
      let matchesStatus = true;
      
      if (this.currentUser?.role === 'ADMIN') {
        matchesStatus = true; // Admin vê todas as salas
      } else if (this.currentUser?.role === 'TEACHER') {
        // Professor vê salas ativas ou salas que ele criou (mesmo inativas)
        matchesStatus = c.isActive || this.isClassroomCreator(c);
      } else {
        // Estudante vê apenas salas ativas
        matchesStatus = c.isActive !== false; // Default para true se não definido
      }
      
      return matchesSearch && matchesStatus;
    });
  }

  private isClassroomCreator(classroom: Classroom): boolean {
    // Verifica se o usuário atual é um dos professores da sala
    // Assumindo que o primeiro professor é o criador
    if (!this.currentUser || !classroom.teachers || classroom.teachers.length === 0) {
      return false;
    }
    
    // Verifica se o usuário atual está na lista de professores
    return classroom.teachers.some(teacher => teacher.id === this.currentUser?.id);
  }

  startEdit(classroom: Classroom) {
    this.editClassroomId = classroom.id;
    this.editName = classroom.name;
    this.editAcademicYear = classroom.academicYear;
  }

  cancelEdit() {
    this.editClassroomId = null;
  }

  saveEdit(classroom: Classroom) {
    this.classroomService.updateClassroom(classroom.id, {
      name: this.editName,
      academicYear: this.editAcademicYear
    }).subscribe(updated => {
      classroom.name = updated.name;
      classroom.academicYear = updated.academicYear;
      this.editClassroomId = null;
    });
  }

  onYearInput(event: any, type: 'new' | 'edit') {
    let value = event.target.value;
    // Remover caracteres não numéricos
    value = value.replace(/[^0-9]/g, '');
    // Limitar a 4 dígitos
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    event.target.value = value;
    
    if (type === 'new') {
      this.newAcademicYear = value;
    } else {
      this.editAcademicYear = value;
    }
  }

  onKeyPress(event: KeyboardEvent): boolean {
    // Permitir apenas números (0-9), backspace, delete, tab, escape, enter
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    
    // Permitir apenas números
    if (event.key >= '0' && event.key <= '9') {
      return true;
    }
    
    // Bloquear todas as outras teclas (letras, símbolos, etc.)
    event.preventDefault();
    return false;
  }

  get isAdminOrTeacher(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'TEACHER';
  }

  loadTeachers() {
    this.userService.getTeachers().subscribe({
      next: (teachers) => {
      this.teachers = teachers;
        // Atualizar filtro se o modal estiver aberto
        if (this.assignMode === 'teacher') {
          // Filtrar professores que não estão selecionados
          this.filteredTeachers = this.teachers.filter(t => !this.selectedTeacherIds.includes(t.id));
        } else {
          // Se o modal não estiver aberto, apenas inicializar
          this.filteredTeachers = this.teachers;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar professores:', err);
        this.teachers = [];
        this.filteredTeachers = [];
      }
    });
  }

  loadStudents() {
    this.userService.getStudents().subscribe({
      next: (students) => {
      this.students = students;
        // Atualizar filtro se o modal estiver aberto
        if (this.assignMode === 'student') {
          // Filtrar alunos que não estão selecionados
          this.filteredStudents = this.students.filter(s => !this.selectedStudentIds.includes(s.id));
        } else {
          // Se o modal não estiver aberto, apenas inicializar
          this.filteredStudents = this.students;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar alunos:', err);
        this.students = [];
        this.filteredStudents = [];
      }
    });
  }

  openAssignTeacher(classroom: Classroom) {
    // Garantir que os professores estão carregados antes de abrir o modal
    if (this.teachers.length === 0) {
      this.loadTeachers();
    }
    
    // Recarregar dados atualizados da sala antes de abrir o modal
    this.classroomService.getClassroomById(classroom.id).subscribe({
      next: (updatedClassroom) => {
        this.assignClassroomId = updatedClassroom.id;
        this.assignMode = 'teacher';
        this.selectedTeacherIds = updatedClassroom.teachers ? updatedClassroom.teachers.map((t: any) => t.id) : [];
        this.searchTeacher = '';
        
        // Aguardar um pouco para garantir que os professores foram carregados
        setTimeout(() => {
          this.filteredTeachers = this.teachers.filter(t => !this.selectedTeacherIds.includes(t.id));
          // Focar no campo de busca
          setTimeout(() => {
            if (this.teacherSearchInput) {
              this.teacherSearchInput.nativeElement.focus();
            }
          }, 50);
        }, 100);
      },
      error: (err) => {
        console.error('Erro ao carregar dados da sala:', err);
        // Mesmo com erro, tentar abrir o modal com os dados atuais
    this.assignClassroomId = classroom.id;
    this.assignMode = 'teacher';
    this.selectedTeacherIds = classroom.teachers ? classroom.teachers.map((t: any) => t.id) : [];
    this.searchTeacher = '';
        this.filteredTeachers = this.teachers.filter(t => !this.selectedTeacherIds.includes(t.id));
      }
    });
  }

  openAssignStudent(classroom: Classroom) {
    // Garantir que os alunos estão carregados antes de abrir o modal
    if (this.students.length === 0) {
      this.loadStudents();
    }
    
    // Recarregar dados atualizados da sala antes de abrir o modal
    this.classroomService.getClassroomById(classroom.id).subscribe({
      next: (updatedClassroom) => {
        this.assignClassroomId = updatedClassroom.id;
        this.assignMode = 'student';
        this.selectedStudentIds = updatedClassroom.students ? updatedClassroom.students.map((s: any) => s.id) : [];
        this.searchStudent = '';
        
        // Aguardar um pouco para garantir que os alunos foram carregados
        setTimeout(() => {
          this.filteredStudents = this.students.filter(s => !this.selectedStudentIds.includes(s.id));
          // Focar no campo de busca
          setTimeout(() => {
            if (this.studentSearchInput) {
              this.studentSearchInput.nativeElement.focus();
            }
          }, 50);
        }, 100);
      },
      error: (err) => {
        console.error('Erro ao carregar dados da sala:', err);
        // Mesmo com erro, tentar abrir o modal com os dados atuais
    this.assignClassroomId = classroom.id;
    this.assignMode = 'student';
    this.selectedStudentIds = classroom.students ? classroom.students.map((s: any) => s.id) : [];
    this.searchStudent = '';
        this.filteredStudents = this.students.filter(s => !this.selectedStudentIds.includes(s.id));
      }
    });
  }

  filterTeachers() {
    if (!this.teachers || this.teachers.length === 0) {
      this.filteredTeachers = [];
      return;
    }
    const search = this.searchTeacher ? this.searchTeacher.toLowerCase().trim() : '';
    // Só mostrar resultados se houver pelo menos um caractere digitado
    if (!search || search.length === 0) {
      this.filteredTeachers = [];
      return;
    }
    this.filteredTeachers = this.teachers.filter(t => {
      const matchesSearch = 
        (t.email && t.email.toLowerCase().includes(search)) || 
        (t.name && t.name.toLowerCase().includes(search)) ||
        (t.nomeCompleto && t.nomeCompleto.toLowerCase().includes(search));
      const notSelected = !this.selectedTeacherIds.includes(t.id);
      return matchesSearch && notSelected;
    });
  }

  filterStudents() {
    if (!this.students || this.students.length === 0) {
      this.filteredStudents = [];
      return;
    }
    const search = this.searchStudent ? this.searchStudent.toLowerCase().trim() : '';
    // Só mostrar resultados se houver pelo menos um caractere digitado
    if (!search || search.length === 0) {
      this.filteredStudents = [];
      return;
    }
    this.filteredStudents = this.students.filter(s => {
      const matchesSearch = 
        (s.email && s.email.toLowerCase().includes(search)) || 
        (s.name && s.name.toLowerCase().includes(search)) ||
        (s.nomeCompleto && s.nomeCompleto.toLowerCase().includes(search));
      const notSelected = !this.selectedStudentIds.includes(s.id);
      return matchesSearch && notSelected;
    });
  }

  addTeacherToSelection(teacher: User) {
    if (!this.selectedTeacherIds.includes(teacher.id)) {
      this.selectedTeacherIds.push(teacher.id);
      this.filterTeachers();
    }
    this.searchTeacher = '';
  }

  removeTeacherFromSelection(teacherId: number) {
    this.selectedTeacherIds = this.selectedTeacherIds.filter(id => id !== teacherId);
    this.filterTeachers();
  }

  addStudentToSelection(student: User) {
    if (!this.selectedStudentIds.includes(student.id)) {
      this.selectedStudentIds.push(student.id);
      this.filterStudents();
    }
    this.searchStudent = '';
  }

  removeStudentFromSelection(studentId: number) {
    this.selectedStudentIds = this.selectedStudentIds.filter(id => id !== studentId);
    this.filterStudents();
  }

  saveTeachers() {
    if (!this.assignClassroomId) {
      console.error('Nenhuma sala selecionada para adicionar professores');
      return;
    }
    
    console.log('Salvando professores para a sala:', this.assignClassroomId);
    console.log('IDs selecionados:', this.selectedTeacherIds);
    
    // Recarregar dados atualizados da sala antes de salvar
    this.classroomService.getClassroomById(this.assignClassroomId).subscribe({
      next: (classroom) => {
        console.log('Dados da sala carregados:', classroom);
    // Adiciona professores que não estão na sala
        const currentTeacherIds = classroom.teachers ? classroom.teachers.map((t: any) => t.id) : [];
        const toAdd = this.selectedTeacherIds.filter(id => !currentTeacherIds.includes(id));
    // Remove professores que foram desmarcados
        const toRemove = currentTeacherIds.filter((id: number) => !this.selectedTeacherIds.includes(id));
        
        console.log('Professores para adicionar:', toAdd);
        console.log('Professores para remover:', toRemove);
        
        // Executar todas as operações e depois recarregar
        const operations: Observable<any>[] = [];
        
        toAdd.forEach(id => {
          console.log('Adicionando professor:', id);
          operations.push(this.classroomService.addTeacher(this.assignClassroomId!, id));
        });
        
        toRemove.forEach(id => {
          console.log('Removendo professor:', id);
          operations.push(this.classroomService.removeTeacher(this.assignClassroomId!, id));
        });
        
        if (operations.length > 0) {
          forkJoin(operations).subscribe({
            next: () => {
              console.log('Operações concluídas com sucesso');
              this.loadClassrooms();
              this.assignClassroomId = null;
              this.selectedTeacherIds = [];
              this.assignMode = null;
            },
            error: (err) => {
              console.error('Erro ao salvar professores:', err);
              console.error('Detalhes do erro:', err.error);
              // Recarregar mesmo em caso de erro
              this.loadClassrooms();
              this.assignClassroomId = null;
              this.selectedTeacherIds = [];
              this.assignMode = null;
            }
          });
        } else {
          console.log('Nenhuma operação necessária');
          // Se não há operações, apenas fechar o modal
    this.assignClassroomId = null;
    this.selectedTeacherIds = [];
          this.assignMode = null;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar dados da sala:', err);
      }
    });
  }

  saveStudents() {
    if (!this.assignClassroomId) {
      console.error('Nenhuma sala selecionada para adicionar alunos');
      return;
    }
    
    console.log('Salvando alunos para a sala:', this.assignClassroomId);
    console.log('IDs selecionados:', this.selectedStudentIds);
    
    // Recarregar dados atualizados da sala antes de salvar
    this.classroomService.getClassroomById(this.assignClassroomId).subscribe({
      next: (classroom) => {
        console.log('Dados da sala carregados:', classroom);
    // Adiciona alunos que não estão na sala
        const currentStudentIds = classroom.students ? classroom.students.map((s: any) => s.id) : [];
        const toAdd = this.selectedStudentIds.filter(id => !currentStudentIds.includes(id));
    // Remove alunos que foram desmarcados
        const toRemove = currentStudentIds.filter((id: number) => !this.selectedStudentIds.includes(id));
        
        console.log('Alunos para adicionar:', toAdd);
        console.log('Alunos para remover:', toRemove);
        
        // Executar todas as operações e depois recarregar
        const operations: Observable<any>[] = [];
        
        toAdd.forEach(id => {
          console.log('Adicionando aluno:', id);
          operations.push(this.classroomService.addStudent(this.assignClassroomId!, id));
        });
        
        toRemove.forEach(id => {
          console.log('Removendo aluno:', id);
          operations.push(this.classroomService.removeStudent(this.assignClassroomId!, id));
        });
        
        if (operations.length > 0) {
          forkJoin(operations).subscribe({
            next: () => {
              console.log('Operações concluídas com sucesso');
              this.loadClassrooms();
              this.assignClassroomId = null;
              this.selectedStudentIds = [];
              this.assignMode = null;
            },
            error: (err) => {
              console.error('Erro ao salvar alunos:', err);
              console.error('Detalhes do erro:', err.error);
              // Recarregar mesmo em caso de erro
              this.loadClassrooms();
              this.assignClassroomId = null;
              this.selectedStudentIds = [];
              this.assignMode = null;
            }
          });
        } else {
          console.log('Nenhuma operação necessária');
          // Se não há operações, apenas fechar o modal
    this.assignClassroomId = null;
    this.selectedStudentIds = [];
    this.assignMode = null;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar dados da sala:', err);
      }
    });
  }

  cancelAssignTeacher() {
    this.assignClassroomId = null;
    this.selectedTeacherIds = [];
  }

  cancelAssignStudent() {
    this.assignClassroomId = null;
    this.selectedStudentIds = [];
    this.assignMode = null;
  }

  getTeacherEmailById(id: number): string {
    const teacher = this.teachers.find(t => t.id === id);
    return teacher ? teacher.email : '';
  }

  getTeacherNameById(id: number): string {
    const teacher = this.teachers.find(t => t.id === id);
    if (teacher) {
      return teacher.nomeCompleto || teacher.name || teacher.email;
    }
    return '';
  }

  getStudentEmailById(id: number): string {
    const student = this.students.find(s => s.id === id);
    return student ? student.email : '';
  }

  getStudentNameById(id: number): string {
    const student = this.students.find(s => s.id === id);
    if (student) {
      return student.nomeCompleto || student.name || student.email;
    }
    return '';
  }

  getTeacherColor(index: number): string {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6610f2', '#fd7e14'];
    return colors[index % colors.length];
  }

  removeTeacherFromClassroom(classroom: Classroom, teacherId: number) {
    this.classroomService.removeTeacher(classroom.id, teacherId).subscribe(() => {
      classroom.teachers = (classroom.teachers || []).filter((t: any) => t.id !== teacherId);
    });
  }

  exportClassroomUsersToPdf(classroom: Classroom) {
    this.classroomService.exportClassroomUsersToPdf(classroom.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `dados_sala_${classroom.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF: ' + (error.error?.message || 'Erro desconhecido'));
      }
    });
  }

  openEditGrades(classroom: Classroom) {
    this.router.navigate(['/edit-grades', classroom.id]);
  }

  openNotasPdfModal(classroom: Classroom) {
    // Carregar dados completos da sala com alunos
    this.classroomService.getClassroomById(classroom.id).subscribe({
      next: (fullClassroom) => {
        // Buscar dados completos dos alunos
        if (fullClassroom.students && fullClassroom.students.length > 0) {
          // Extrair IDs dos alunos da sala
          const studentIds = fullClassroom.students.map((s: any) => s.id);
          // Carregar lista completa de alunos e filtrar pelos IDs da sala
          this.userService.getStudents().subscribe({
            next: (allStudents) => {
              const classroomStudents = allStudents.filter(s => 
                studentIds.includes(s.id)
              );
              this.notasPdfClassroom = {
                ...fullClassroom,
                students: classroomStudents
              };
              this.filteredNotasPdfStudents = classroomStudents;
              this.notasPdfSearch = '';
              this.showNotasPdfModal = true;
            },
            error: (error) => {
              console.error('Erro ao carregar alunos:', error);
              alert('Erro ao carregar dados dos alunos');
            }
          });
        } else {
          this.notasPdfClassroom = {
            ...fullClassroom,
            students: []
          };
          this.filteredNotasPdfStudents = [];
          this.notasPdfSearch = '';
          this.showNotasPdfModal = true;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar dados da sala:', error);
        alert('Erro ao carregar dados da sala');
      }
    });
  }

  closeNotasPdfModal() {
    this.showNotasPdfModal = false;
    this.notasPdfClassroom = null;
    this.notasPdfSearch = '';
    this.filteredNotasPdfStudents = [];
  }

  filterNotasPdfStudents() {
    if (!this.notasPdfClassroom || !this.notasPdfClassroom.students) {
      this.filteredNotasPdfStudents = [];
      return;
    }

    const search = this.notasPdfSearch ? this.notasPdfSearch.toLowerCase().trim() : '';
    if (!search || search.length === 0) {
      this.filteredNotasPdfStudents = this.notasPdfClassroom.students;
      return;
    }

    this.filteredNotasPdfStudents = this.notasPdfClassroom.students.filter(s => {
      const email = (s.email || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      const nomeCompleto = (s.nomeCompleto || '').toLowerCase();
      return email.includes(search) || name.includes(search) || nomeCompleto.includes(search);
    });
  }

  exportAllStudentsGradesToPdf() {
    if (!this.notasPdfClassroom || !this.notasPdfClassroom.id) {
      return;
    }
    this.classroomService.exportAllStudentsGradesToPdf(this.notasPdfClassroom.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `notas_todos_alunos_${this.notasPdfClassroom!.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erro ao gerar PDF de todas as notas:', error);
        alert('Erro ao gerar PDF de todas as notas: ' + (error.error?.message || 'Erro desconhecido'));
      }
    });
  }

  exportStudentGradesToPdf(classroomId: number, studentId: number) {
    this.classroomService.exportStudentGradesToPdf(classroomId, studentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const student = this.notasPdfClassroom?.students?.find(s => s.id === studentId);
        const studentName = student?.nomeCompleto || student?.name || 'aluno';
        const filename = `notas_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.closeNotasPdfModal();
      },
      error: (error) => {
        console.error('Erro ao gerar PDF de notas:', error);
        alert('Erro ao gerar PDF de notas: ' + (error.error?.message || 'Erro desconhecido'));
      }
    });
  }
} 