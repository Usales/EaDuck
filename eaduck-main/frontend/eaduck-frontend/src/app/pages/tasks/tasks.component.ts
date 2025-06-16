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

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
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
  newTitle = '';
  newDescription = '';
  newDueDate = '';
  newClassroomId: number | null = null;

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
  filterClassroomId: number | 'all' = 'all';
  filteredTasks: Task[] = [];

  // Resumo
  totalTasks = 0;
  totalConcluidas = 0;
  totalPendentes = 0;
  totalAtrasadas = 0;

  constructor(
    private taskService: TaskService,
    private classroomService: ClassroomService,
    private submissionService: SubmissionService,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.loadTasks();
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
      const status = this.getTaskStatus(task);
      const statusOk = this.filterStatus === 'all' || status === this.filterStatus;
      const classroomOk = this.filterClassroomId === 'all' || task.classroomId === this.filterClassroomId;
      return statusOk && classroomOk;
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
    let dueDate = this.editDueDate;
    if (dueDate && dueDate.length === 10) {
      dueDate = dueDate + 'T00:00:00';
    }
    this.taskService.updateTask(task.id, {
      title: this.editTitle,
      description: this.editDescription,
      dueDate: dueDate
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
    this.newTitle = '';
    this.newDescription = '';
    this.newDueDate = '';
    this.newClassroomId = null;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createTask() {
    if (!this.newTitle || !this.newClassroomId) return;
    let dueDate = this.newDueDate;
    if (dueDate && dueDate.length === 10) {
      dueDate = dueDate + 'T00:00:00';
    }
    this.taskService.createTask({
      title: this.newTitle,
      description: this.newDescription,
      dueDate: dueDate,
      classroomId: this.newClassroomId
    }).subscribe({
      next: (newTask) => {
        this.tasks.push(newTask);
        this.applyFilters();
        this.closeCreateModal();
      },
      error: (error) => {
        console.error('Erro ao criar tarefa:', error);
      }
    });
  }

  openSubmissionsModal(task: Task) {
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
}
