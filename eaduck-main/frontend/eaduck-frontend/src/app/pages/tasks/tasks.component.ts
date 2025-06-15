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
    this.taskService.getAllTasks().subscribe(tasks => this.tasks = tasks);
  }

  startEdit(task: Task) {
    this.editTaskId = task.id;
    this.editTitle = task.title;
    this.editDescription = task.description;
    this.editDueDate = task.dueDate;
  }

  cancelEdit() {
    this.editTaskId = null;
  }

  saveEdit(task: Task) {
    this.taskService.updateTask(task.id, {
      title: this.editTitle,
      description: this.editDescription,
      dueDate: this.editDueDate
    }).subscribe(updated => {
      task.title = updated.title;
      task.description = updated.description;
      task.dueDate = updated.dueDate;
      this.editTaskId = null;
    });
  }

  deleteTask(task: Task) {
    this.taskService.deleteTask(task.id).subscribe(() => {
      this.tasks = this.tasks.filter(t => t.id !== task.id);
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
    this.taskService.createTask({
      title: this.newTitle,
      description: this.newDescription,
      dueDate: this.newDueDate,
      classroomId: this.newClassroomId
    }).subscribe(newTask => {
      this.tasks.push(newTask);
      this.closeCreateModal();
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
}
