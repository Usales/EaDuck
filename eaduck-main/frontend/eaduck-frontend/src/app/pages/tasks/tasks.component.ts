import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule, LoadingModalComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit {
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
  evalSubmission: Submission | null = null;
  evalGrade: number | null = null;
  evalFeedback = '';
  showEvalModal = false;

  currentUser$: Observable<User | null>;

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

  constructor(
    private taskService: TaskService,
    private classroomService: ClassroomService,
    private submissionService: SubmissionService,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'STUDENT') {
      this.classroomService.getMyClassrooms().subscribe(classrooms => {
        const classroomIds = classrooms.map(c => c.id);
        const tasksArr: Task[] = [];
        let loaded = 0;
        if (classroomIds.length === 0) {
          this.tasks = [];
          this.applyFilters();
        }
        classroomIds.forEach(id => {
          this.taskService.getTasksByClassroom(id).subscribe(ts => {
            tasksArr.push(...ts);
            loaded++;
            if (loaded === classroomIds.length) {
              this.tasks = tasksArr;
              this.applyFilters();
            }
          });
        });
      });
    } else {
      this.loadTasks();
    }
    this.classroomService.getAllClassrooms().subscribe(cs => this.classrooms = cs);
  }

  loadTasks() {
    this.taskService.getAllTasks().subscribe(tasks => {
      this.tasks = tasks;
      this.applyFilters();
    });
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
        console.error('Erro ao excluir tarefa:', error);
      }
    });
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
    if (!task.id) return;
    this.selectedTask = task;
    this.submissionService.getSubmissionsByTask(task.id).subscribe(subs => {
      this.submissions = subs;
      this.showSubmissionsModal = true;
    });
  }

  closeSubmissionsModal() {
    this.showSubmissionsModal = false;
    this.selectedTask = null;
    this.submissions = [];
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
    this.submissionService.evaluateSubmission(this.evalSubmission.id, this.evalGrade ?? 0, this.evalFeedback).subscribe(updated => {
      // Atualiza na lista
      const idx = this.submissions.findIndex(s => s.id === updated.id);
      if (idx !== -1) this.submissions[idx] = updated;
      this.closeEvalModal();
    });
  }

  get isAdminOrTeacher(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'TEACHER';
  }

  // Novo: status das tarefas
  getTaskStatus(task: Task): 'concluida' | 'atrasada' | 'pendente' {
    const today = new Date();
    const due = new Date(task.dueDate);
    // Zerar hora/minuto/segundo para comparar apenas a data
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const hasSubmission = this.submissions.some(s => s.taskId === task.id);
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
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Verifica o tipo do arquivo
      if (!this.allowedFileTypes.includes(file.type)) {
        this.fileError = 'Tipo de arquivo não permitido. Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, ZIP, RAR';
        this.selectedFile = null;
        input.value = ''; // Limpa o input
        return;
      }

      // Verifica o tamanho do arquivo (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.fileError = 'O arquivo é muito grande. Tamanho máximo permitido: 10MB';
        this.selectedFile = null;
        input.value = ''; // Limpa o input
        return;
      }

      this.fileError = '';
      this.selectedFile = file;
    }
  }

  submitTask() {
    if (!this.selectedTaskForSubmit?.id) return;

    if (this.fileError) {
      return; // Não permite submissão se houver erro no arquivo
    }

    this.showLoadingModal = true;
    this.loadingStatus = 'loading';

    const formData = new FormData();
    formData.append('content', this.submitContent);
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.submissionService.submitTask(this.selectedTaskForSubmit.id, formData).subscribe({
      next: () => {
        this.loadingStatus = 'success';
        this.closeSubmitModal();
        setTimeout(() => this.showLoadingModal = false, 2000);
      },
      error: (error: Error) => {
        this.loadingStatus = 'error';
        setTimeout(() => this.showLoadingModal = false, 2500);
        console.error('Erro ao enviar tarefa:', error);
      }
    });
  }
}
