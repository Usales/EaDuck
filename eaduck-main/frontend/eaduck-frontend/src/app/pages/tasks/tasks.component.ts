import { Component, OnInit, OnDestroy } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { FormsModule } from '@angular/forms';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { SubmissionService, Submission } from '../../services/submission.service';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../services/user.service';
import { LoadingModalComponent } from '../../components/loading-modal/loading-modal.component';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, LoadingModalComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  editTaskId: number | null = null;
  editTitle = '';
  editDescription = '';
  editDueDate = '';

  showCreateModal = false;
  taskForm: Partial<Task> = { title: '', description: '', dueDate: '', classroomId: undefined, type: 'TAREFA' };

  classrooms: Classroom[] = [];

  selectedTask: Task | null = null;
  submissions: Submission[] = [];
  showSubmissionsModal = false;
  filteredSubmissions: Submission[] = [];
  evalSubmission: Submission | null = null;
  evalGrade: number | null = null;
  evalFeedback = '';
  showEvalModal = false;
  showEvalSuccessModal = false;

  currentUser$: Observable<User | null>;
  currentUser: User | null = null;

  // Filtros
  filterStatus: 'all' | 'pendente' | 'concluida' | 'atrasada' = 'all';
  filterClassroomId: number | 'all' | undefined = 'all';
  filterType: 'all' | 'TAREFA' | 'PROVA' | 'FORUM' | 'NOTIFICACAO' = 'all';
  filteredTasks: Task[] = [];

  // Resumo
  totalTasks = 0;
  totalConcluidas = 0;
  totalPendentes = 0;
  totalAtrasadas = 0;

  dueDateError = false;

  showLoadingModal = false;
  loadingStatus: 'loading' | 'success' | 'error' = 'loading';

  // Propriedades para submissão
  showSubmitModal = false;
  submitContent = '';
  selectedFile: File | null = null;
  selectedTaskForSubmit: Task | null = null;
  fileError = '';
  submitSuccess = false;

  // Tipos de arquivo permitidos
  private readonly allowedFileTypes = [
    'application/pdf', // PDF
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-excel', // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-powerpoint', // PPT
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'text/plain', // TXT
    'image/jpeg', // JPG
    'image/png', // PNG
    'application/zip', // ZIP
    'application/x-rar-compressed' // RAR
  ];
  private readonly maxFileSize = 8 * 1024 * 1024; // 8MB

  showErrorModal = false;
  errorModalMessage = '';

  showStudentsModal = false;
  selectedTaskStudents: { email: string; name: string; submitted: boolean; submission?: Submission }[] = [];
  allStudents: User[] = [];

  private updateInterval: any;
  private readonly UPDATE_INTERVAL_MS = 1000; // 1 segundo

  showEditErrorModal = false;
  editErrorModalMessage = '';

  showDeleteErrorModal = false;
  deleteErrorModalMessage = '';

  constructor(
    private taskService: TaskService,
    private classroomService: ClassroomService,
    private submissionService: SubmissionService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.currentUser$?.subscribe(user => {
      this.currentUser = user;
      if (user && user.role === 'STUDENT') {
        this.loadMySubmissions();
      }
    });
    this.loadTasks();
    this.loadClassrooms();
    this.loadAllStudents();
  }

  ngOnDestroy(): void {
    this.stopAutoUpdate();
  }

  private startAutoUpdate(): void {
    this.updateInterval = setInterval(() => {
      if (this.currentUser?.role !== 'STUDENT') {
        this.loadAllSubmissionsForTasks(this.tasks);
      } else {
        this.loadMySubmissions();
      }
    }, this.UPDATE_INTERVAL_MS);
  }

  private stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  loadTasks() {
    this.taskService.getAllTasks().subscribe(tasks => {
      this.tasks = tasks;
      this.applyFilters();
      if (this.currentUser && this.currentUser.role !== 'STUDENT') {
        this.loadAllSubmissionsForTasks(tasks);
      }
    });
  }

  loadAllSubmissionsForTasks(tasks: Task[]) {
    const taskIds = tasks.map(t => t.id).filter(id => !!id) as number[];
    if (taskIds.length === 0) return;

    this.submissionService.getAllSubmissions().subscribe((allSubmissions: Submission[]) => {
      this.submissions = allSubmissions.filter((sub: Submission) => 
        taskIds.includes(sub.taskId)
      );
      this.applyFilters();
    });
  }

  loadClassrooms() {
    this.classroomService.getAllClassrooms().subscribe(cs => this.classrooms = cs);
  }

  applyFilters() {
    this.filteredTasks = this.tasks.filter(task => {
      const statusMatch = this.filterStatus === 'all' || this.getTaskStatus(task) === this.filterStatus;
      const classroomMatch = this.filterClassroomId === 'all' || task.classroomId === this.filterClassroomId;
      const typeMatch = this.filterType === 'all' || task.type === this.filterType;
      return statusMatch && classroomMatch && typeMatch;
    });
    this.updateResumo();
  }

  updateResumo() {
    this.totalTasks = this.filteredTasks.length;
    this.totalConcluidas = this.filteredTasks.filter(t => this.getTaskStatus(t) === 'concluida').length;
    this.totalPendentes = this.filteredTasks.filter(t => this.getTaskStatus(t) === 'pendente').length;
    this.totalAtrasadas = this.filteredTasks.filter(t => this.getTaskStatus(t) === 'atrasada').length;
  }

  startEdit(task: Task) {
    if (!task.id) return;
    this.editTaskId = task.id;
    this.editTitle = task.title;
    this.editDescription = task.description;
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      this.editDueDate = date.toISOString().slice(0, 10);
    } else {
      this.editDueDate = '';
    }
  }

  cancelEdit() {
    this.editTaskId = null;
  }

  saveEdit(task: Task) {
    if (!task.id) return;
    let dueDate = this.editDueDate;
    if (dueDate && dueDate.length === 10) {
      dueDate = dueDate + 'T00:00:00';
    }
    this.taskService.updateTask(task.id, {
      title: this.editTitle,
      description: this.editDescription,
      dueDate: dueDate,
      type: task.type
    }).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          this.tasks[index] = updated;
          this.applyFilters();
        }
        this.editTaskId = null;
      },
      error: (error) => {
        if (error && error.status === 409) {
          this.editErrorModalMessage = 'Não é possível editar esta tarefa pois já existem respostas enviadas por alunos.';
        } else {
          this.editErrorModalMessage = 'Erro ao atualizar tarefa.';
        }
        this.showEditErrorModal = true;
        console.error('Erro ao atualizar tarefa:', error);
      }
    });
  }

  deleteTask(task: Task) {
    if (!task.id) return;
    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.id !== task.id);
        this.applyFilters();
      },
      error: (error) => {
        if (error && error.status === 409 && error.error) {
          this.deleteErrorModalMessage = error.error;
        } else {
          this.deleteErrorModalMessage = 'Erro ao excluir tarefa.';
        }
        this.showDeleteErrorModal = true;
        console.error('Erro ao excluir tarefa:', error);
      }
    });
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorModalMessage = '';
  }

  openCreateModal() {
    this.showCreateModal = true;
    this.taskForm = { title: '', description: '', dueDate: '', classroomId: undefined, type: 'TAREFA' };
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createTask() {
    this.dueDateError = false;
    if (!this.taskForm.title || !this.taskForm.classroomId) return;
    if (!this.taskForm.dueDate) {
      this.dueDateError = true;
      return;
    }
    let dueDate = this.taskForm.dueDate;
    if (dueDate && dueDate.length === 10) {
      dueDate = dueDate + 'T00:00:00';
    }
    this.showCreateModal = false;
    this.showLoadingModal = true;
    this.loadingStatus = 'loading';
    this.taskService.createTask({
      title: this.taskForm.title!,
      description: this.taskForm.description!,
      dueDate: dueDate!,
      classroomId: this.taskForm.classroomId!,
      type: this.taskForm.type!
    }).subscribe({
      next: () => {
        this.loadingStatus = 'success';
        this.taskForm = { title: '', description: '', dueDate: '', classroomId: undefined, type: 'TAREFA' };
        this.loadTasks();
        setTimeout(() => this.showLoadingModal = false, 2000);
      },
      error: (error) => {
        this.loadingStatus = 'error';
        setTimeout(() => this.showLoadingModal = false, 2500);
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  openSubmissionsModal(task: Task) {
    this.selectedTask = task;
    this.filteredSubmissions = this.submissions.filter(s => s.taskId === task.id);
    this.showSubmissionsModal = true;
  }

  closeSubmissionsModal() {
    this.showSubmissionsModal = false;
    this.selectedTask = null;
    this.filteredSubmissions = [];
  }

  openEvalModal(sub: Submission) {
    this.evalSubmission = sub;
    this.evalGrade = sub.grade ?? null;
    this.evalFeedback = sub.feedback ?? '';
    this.showEvalModal = true;
  }

  closeEvalModal() {
    this.showEvalModal = false;
    this.evalSubmission = null;
    this.evalGrade = null;
    this.evalFeedback = '';
  }

  saveEvaluation() {
    if (!this.evalSubmission) return;
    this.submissionService.evaluateSubmission(this.evalSubmission.id, this.evalGrade ?? 0, this.evalFeedback).subscribe({
      next: (updated) => {
        if (updated && updated.id) {
          // Atualiza a submissão na lista principal
          const idx = this.submissions.findIndex(s => s && s.id === updated.id);
          if (idx !== -1) {
            this.submissions[idx] = updated;
          }
          
          // Atualiza a submissão na lista filtrada
          if (this.selectedTask) {
            const filteredIdx = this.filteredSubmissions.findIndex(s => s.id === updated.id);
            if (filteredIdx !== -1) {
              this.filteredSubmissions[filteredIdx] = updated;
            }
          }
        }
        this.closeEvalModal();
        this.showEvalSuccessModal = true;
      },
      error: (error) => {
        console.error('Erro ao avaliar submissão:', error);
        this.closeEvalModal();
      }
    });
  }

  closeEvalSuccessModal() {
    this.showEvalSuccessModal = false;
  }

  get isAdminOrTeacher(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'TEACHER';
  }

  // Novo: status das tarefas
  getTaskStatus(task: Task): 'concluida' | 'atrasada' | 'pendente' {
    const today = new Date();
    const due = new Date(task.dueDate);
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const taskSubmissions = this.submissions.filter(s => s.taskId === task.id);
    let hasSubmission = false;
    if (this.currentUser?.role === 'STUDENT') {
      hasSubmission = taskSubmissions.length > 0;
    } else {
      hasSubmission = taskSubmissions.length > 0;
    }
    if (hasSubmission) return 'concluida';
    if (today > due) return 'atrasada';
    return 'pendente';
  }

  getTaskTypeIcon(type: string): string {
    switch (type) {
      case 'TAREFA': return 'assignment';
      case 'PROVA': return 'quiz';
      case 'FORUM': return 'forum';
      case 'NOTIFICACAO': return 'notifications';
      default: return 'assignment';
    }
  }

  getTaskTypeColor(type: string): string {
    switch (type) {
      case 'TAREFA': return 'bg-blue-600';
      case 'PROVA': return 'bg-red-600';
      case 'FORUM': return 'bg-green-600';
      case 'NOTIFICACAO': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  }

  getTaskTypeLabel(type: string): string {
    switch (type) {
      case 'TAREFA': return 'Tarefa';
      case 'PROVA': return 'Prova';
      case 'FORUM': return 'Fórum';
      case 'NOTIFICACAO': return 'Notificação';
      default: return 'Tarefa';
    }
  }

  openSubmitModal(task: Task) {
    this.selectedTaskForSubmit = task;
    this.showSubmitModal = true;
  }

  closeSubmitModal() {
    this.showSubmitModal = false;
    this.selectedTaskForSubmit = null;
    this.submitContent = '';
    this.selectedFile = null;
    this.fileError = '';
    this.submitSuccess = false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Verifica o tipo do arquivo
      if (!this.allowedFileTypes.includes(file.type)) {
        this.fileError = 'Tipo de arquivo não permitido. Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, ZIP, RAR';
        this.selectedFile = null;
        input.value = '';
        return;
      }
      // Verifica o tamanho do arquivo (máximo 8MB)
      if (file.size > this.maxFileSize) {
        this.fileError = 'O arquivo é muito grande. Tamanho máximo permitido: 8MB';
        this.selectedFile = null;
        input.value = '';
        return;
      }
      this.fileError = '';
      this.selectedFile = file;
    }
  }

  submitTask() {
    if (!this.selectedTaskForSubmit?.id) return;
    if (this.fileError) {
      return;
    }
    this.showLoadingModal = true;
    this.loadingStatus = 'loading';
    const formData = new FormData();
    formData.append('content', this.submitContent);
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }
    this.submissionService.submitTask(this.selectedTaskForSubmit.id, formData).subscribe({
      next: (response: any) => {
        this.loadingStatus = 'success';
        this.submitSuccess = true;
        // Atualiza submissões do aluno para refletir status concluído
        this.loadMySubmissions();
        setTimeout(() => this.showLoadingModal = false, 1000);
      },
      error: (error: any) => {
        this.loadingStatus = 'error';
        if (error && error.error) {
          // Se o erro for uma string (mensagem de sucesso), trata como sucesso
          if (typeof error.error === 'string' && error.error.includes('sucesso')) {
            this.loadingStatus = 'success';
            this.submitSuccess = true;
            this.loadMySubmissions();
            setTimeout(() => this.showLoadingModal = false, 1000);
            return;
          }
          this.fileError = typeof error.error === 'string' ? error.error : 'Erro ao enviar tarefa.';
        }
        setTimeout(() => this.showLoadingModal = false, 2500);
        console.error('Erro ao enviar tarefa:', error);
      }
    });
  }

  loadMySubmissions() {
    this.submissionService.getMySubmissions().subscribe(subs => {
      this.submissions = subs;
    });
  }

  getSubmissionsCount(taskId: number | undefined): number {
    if (!taskId) return 0;
    return this.submissions.filter(s => s.taskId === taskId).length;
  }

  getSubmittersEmails(taskId: number | undefined): string[] {
    if (!taskId) return [];
    return this.submissions
      .filter(s => s.taskId === taskId)
      .map(s => s.studentId?.toString() ?? '');
  }

  loadAllStudents() {
    this.userService.getAllUsers().subscribe(users => {
      this.allStudents = users.filter(user => user.role === 'STUDENT');
    });
  }

  openStudentsModal(task: Task) {
    this.selectedTask = task;
    this.showStudentsModal = true;
    this.selectedTaskStudents = [];
    // Buscar alunos da turma da tarefa
    this.classroomService.getClassroomById(task.classroomId).subscribe({
      next: (classroom) => {
        this.selectedTaskStudents = (classroom.students || []).map(student => {
          const submission = this.submissions.find(s => s.studentId === student.id && s.taskId === task.id);
          return {
            email: student.email,
            name: student.name || '',
            submitted: !!submission,
            submission: submission
          };
        });
      }
    });
  }

  closeStudentsModal() {
    this.showStudentsModal = false;
    this.selectedTaskStudents = [];
  }

  getSubmissionStatus(submission?: Submission): string {
    if (!submission) return 'Pendente';
    if (submission.grade !== null) return `Avaliado (${submission.grade})`;
    return 'Enviado';
  }

  getSubmissionStatusClass(submission?: Submission): string {
    if (!submission) return 'bg-yellow-100 text-yellow-800';
    if (submission.grade !== null) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  }

  getSubmissionsForTask(taskId: number | undefined): Submission[] {
    if (!taskId) return [];
    return this.submissions.filter(s => s.taskId === taskId);
  }
}
