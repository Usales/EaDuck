import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { UserService, User } from '../../services/user.service';
import { TaskService, Task } from '../../services/task.service';
import { SubmissionService, Submission } from '../../services/submission.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

interface GradeRow {
  student: User;
  discipline: string;
  nota1?: number;
  nota2?: number;
  nota3?: number;
  media?: number;
  recuperacao?: number;
  resultadoFinal: string;
  submission?: Submission;
  task?: Task;
}

@Component({
  selector: 'app-edit-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './edit-grades.component.html',
  styleUrl: './edit-grades.component.scss'
})
export class EditGradesComponent implements OnInit {
  classroomId!: number;
  classroom: Classroom | null = null;
  students: User[] = [];
  tasks: Task[] = [];
  gradeRows: GradeRow[] = [];
  studentFilter: string = '';
  disciplineFilter: string = '';
  loading = true;
  saving = false;
  currentUser: User | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private classroomService: ClassroomService,
    private userService: UserService,
    private taskService: TaskService,
    private submissionService: SubmissionService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.classroomId = +params['id'];
      this.loadData();
    });
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  loadData() {
    this.loading = true;
    
    forkJoin({
      classroom: this.classroomService.getClassroomById(this.classroomId),
      tasks: this.taskService.getTasksByClassroom(this.classroomId)
    }).subscribe({
      next: ({ classroom, tasks }) => {
        this.classroom = classroom;
        this.tasks = tasks;
        this.loadStudents();
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.loading = false;
      }
    });
  }

  loadStudents() {
    const classroom = this.classroom;
    
    if (!classroom) {
      this.loading = false;
      return;
    }

    // Tentar pegar IDs dos alunos de diferentes formas
    let studentIds: number[] = [];
    
    // Verificar se há studentIds direto no objeto
    if ((classroom as any).studentIds && Array.isArray((classroom as any).studentIds)) {
      studentIds = (classroom as any).studentIds;
    } else if (classroom.students && classroom.students.length > 0) {
      // Se students é um array de objetos
      studentIds = classroom.students.map((s: any) => {
        if (typeof s === 'number') return s;
        return s.id;
      }).filter(id => id !== undefined && id !== null);
    }

    console.log('Student IDs encontrados:', studentIds);
    console.log('Classroom data:', classroom);

    if (studentIds.length === 0) {
      console.warn('Nenhum aluno encontrado na sala');
      this.students = [];
      this.buildGradeRows([]);
      return;
    }

    this.userService.getStudents().subscribe({
      next: (allStudents) => {
        console.log('Todos os alunos carregados:', allStudents.length);
        console.log('IDs para filtrar:', studentIds);
        
        // Filtrar alunos que estão na sala
        this.students = allStudents.filter(s => {
          const matches = studentIds.includes(s.id);
          if (matches) {
            console.log('Aluno encontrado:', s.email, s.id);
          }
          return matches;
        });
        
        console.log('Alunos filtrados para a sala:', this.students.length);
        console.log('Alunos:', this.students);
        
        if (this.students.length === 0) {
          console.warn('Nenhum aluno corresponde aos IDs da sala. Verificando se os IDs estão corretos...');
          // Tentar usar os dados dos alunos que já vêm no classroom
          if (classroom.students && classroom.students.length > 0) {
            this.students = classroom.students as any;
            console.log('Usando alunos do classroom diretamente:', this.students);
          }
        }
        
        this.loadGrades();
      },
      error: (error) => {
        console.error('Erro ao carregar alunos:', error);
        // Tentar usar os alunos que já vêm no classroom
        if (classroom.students && classroom.students.length > 0) {
          this.students = classroom.students as any;
          this.loadGrades();
        } else {
          this.loading = false;
        }
      }
    });
  }

  loadGrades() {
    // Para cada tarefa, carregar as submissões
    const taskSubmissionPromises = this.tasks.map(task => 
      this.submissionService.getSubmissionsByTask(task.id!).pipe(
        map((submissions: Submission[]) => ({ task, submissions }))
      )
    );

    if (taskSubmissionPromises.length === 0) {
      this.buildGradeRows([]);
      return;
    }

    forkJoin(taskSubmissionPromises).subscribe({
      next: (taskSubmissions) => {
        this.buildGradeRows(taskSubmissions);
      },
      error: (error) => {
        console.error('Erro ao carregar notas:', error);
        this.loading = false;
      }
    });
  }

  buildGradeRows(taskSubmissions: any[]) {
    this.gradeRows = [];

    console.log('Construindo linhas de notas...');
    console.log('Alunos:', this.students);
    console.log('Tarefas:', this.tasks);
    console.log('Submissões:', taskSubmissions);

    // Se não houver alunos, não criar linhas
    if (this.students.length === 0) {
      console.warn('Nenhum aluno para criar linhas');
      this.loading = false;
      return;
    }

    // Se não houver tarefas, criar uma linha por aluno sem disciplina
    if (this.tasks.length === 0) {
      this.students.forEach(student => {
        this.gradeRows.push({
          student,
          discipline: '-',
          nota1: undefined,
          nota2: undefined,
          nota3: undefined,
          media: undefined,
          recuperacao: undefined,
          resultadoFinal: 'Em andamento',
          submission: undefined,
          task: undefined
        });
      });
      this.loading = false;
      return;
    }

    // Criar uma linha para cada combinação de aluno e tarefa
    this.students.forEach(student => {
      this.tasks.forEach(task => {
        const taskSub = taskSubmissions.find(ts => ts && ts.task && ts.task.id === task.id);
        const submission = taskSub?.submissions?.find((s: Submission) => s && s.studentId === student.id);
        
        // Por enquanto, vamos usar apenas uma nota por tarefa
        // Se houver múltiplas notas, precisaríamos de uma estrutura diferente
        const nota1 = submission?.grade;
        const media = nota1;
        const resultadoFinal = media !== undefined && media !== null
          ? (media >= 6 ? 'Aprovado' : 'Reprovado')
          : 'Em andamento';

        this.gradeRows.push({
          student,
          discipline: task.discipline || task.title,
          nota1,
          nota2: undefined,
          nota3: undefined,
          media,
          recuperacao: undefined,
          resultadoFinal,
          submission,
          task
        });
      });
    });

    console.log('Linhas de notas criadas:', this.gradeRows.length);
    this.loading = false;
  }

  get filteredGradeRows(): GradeRow[] {
    return this.gradeRows.filter(row => {
      const matchesStudent = this.studentFilter
        ? row.student?.id?.toString() === this.studentFilter
        : true;
      const matchesDiscipline = this.disciplineFilter
        ? row.discipline === this.disciplineFilter
        : true;
      return matchesStudent && matchesDiscipline;
    });
  }

  getStudentDisplayName(student: User | undefined | null): string {
    if (!student) return '-';
    return student.nomeCompleto?.trim()
      || student.name?.trim()
      || student.email;
  }

  isNewStudentRow(index: number): boolean {
    if (index === 0) return true;
    const currentRow = this.filteredGradeRows[index];
    const previousRow = this.filteredGradeRows[index - 1];
    if (!currentRow || !previousRow) return true;
    return currentRow.student?.id !== previousRow.student?.id;
  }

  shouldShowStudentInfo(index: number): boolean {
    return this.isNewStudentRow(index);
  }

  calculateMedia(row: GradeRow): number | undefined {
    const notas = [row.nota1, row.nota2, row.nota3].filter(n => n !== undefined && n !== null) as number[];
    if (notas.length === 0) return undefined;
    const soma = notas.reduce((sum, nota) => sum + nota, 0);
    return soma / notas.length;
  }

  updateMedia(row: GradeRow) {
    row.media = this.calculateMedia(row);
    if (row.media !== undefined) {
      row.resultadoFinal = row.media >= 6 ? 'Aprovado' : 'Reprovado';
    } else {
      row.resultadoFinal = 'Em andamento';
    }
  }

  onGradeChange(row: GradeRow) {
    this.updateMedia(row);
  }

  saveGrade(row: GradeRow) {
    if (!row.task || !row.student) return;

    const grade = row.nota1 || 0;

    if (row.submission) {
      // Atualizar submissão existente
      this.submissionService.evaluateSubmission(
        row.submission.id,
        grade,
        row.submission.feedback || ''
      ).subscribe({
        next: () => {
          alert('Nota salva com sucesso!');
          this.loadGrades(); // Recarregar para atualizar
        },
        error: (error) => {
          console.error('Erro ao salvar nota:', error);
          alert('Erro ao salvar nota');
        }
      });
    } else {
      alert('Submissão não encontrada. O aluno precisa enviar a tarefa primeiro.');
    }
  }

  saveAllGrades() {
    this.saving = true;
    const savePromises: any[] = [];

    this.gradeRows.forEach(row => {
      if (row.submission && row.nota1 !== undefined && row.nota1 !== null) {
        savePromises.push(
          this.submissionService.evaluateSubmission(
            row.submission.id,
            row.nota1,
            row.submission.feedback || ''
          )
        );
      }
    });

    if (savePromises.length === 0) {
      alert('Nenhuma nota para salvar.');
      this.saving = false;
      return;
    }

    forkJoin(savePromises).subscribe({
      next: () => {
        alert('Todas as notas foram salvas com sucesso!');
        this.saving = false;
        this.loadGrades();
      },
      error: (error) => {
        console.error('Erro ao salvar notas:', error);
        alert('Erro ao salvar algumas notas');
        this.saving = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/classrooms']);
  }

  canEdit(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'TEACHER';
  }
}

