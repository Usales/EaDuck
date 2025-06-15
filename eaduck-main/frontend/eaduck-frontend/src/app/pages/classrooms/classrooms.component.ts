import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../services/user.service';
import { UserService } from '../../services/user.service';

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

  currentUser$: Observable<User | null>;
  teachers: User[] = [];
  selectedTeacherIds: number[] = [];
  searchTeacher = '';
  filteredTeachers: User[] = [];
  assignClassroomId: number | null = null;

  constructor(private classroomService: ClassroomService, private authService: AuthService, private userService: UserService) {
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
    });
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
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
    }
  }

  loadClassrooms() {
    this.classroomService.getAllClassrooms().subscribe(classrooms => {
      this.classrooms = classrooms;
      this.applyFilter();
    });
  }

  applyFilter() {
    const f = this.filter.toLowerCase();
    this.filteredClassrooms = this.classrooms.filter(c =>
      c.name.toLowerCase().includes(f) ||
      (c.academicYear || '').toLowerCase().includes(f)
    );
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
    if (value.length > 4) {
      value = value.slice(0, 4);
      event.target.value = value;
    }
    if (type === 'new') {
      this.newAcademicYear = value;
    } else {
      this.editAcademicYear = value;
    }
  }

  get isAdminOrTeacher(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'TEACHER';
  }

  loadTeachers() {
    this.userService.getUsersByRole('TEACHER').subscribe(teachers => {
      this.teachers = teachers;
    });
  }

  openAssignTeacher(classroom: Classroom) {
    this.assignClassroomId = classroom.id;
    this.selectedTeacherIds = classroom.teachers ? classroom.teachers.map((t: any) => t.id) : [];
    this.searchTeacher = '';
    this.filteredTeachers = this.teachers;
  }

  filterTeachers() {
    const search = this.searchTeacher.toLowerCase();
    this.filteredTeachers = this.teachers.filter(t => t.email.toLowerCase().includes(search) && !this.selectedTeacherIds.includes(t.id));
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

  saveTeachers() {
    if (!this.assignClassroomId) return;
    const classroom = this.classrooms.find(c => c.id === this.assignClassroomId);
    if (!classroom) return;
    // Adiciona professores que não estão na sala
    const toAdd = this.selectedTeacherIds.filter(id => !classroom.teachers?.some((t: any) => t.id === id));
    // Remove professores que foram desmarcados
    const toRemove = (classroom.teachers || []).filter((t: any) => !this.selectedTeacherIds.includes(t.id)).map((t: any) => t.id);
    toAdd.forEach(id => this.classroomService.addTeacher(this.assignClassroomId!, id).subscribe(() => this.loadClassrooms()));
    toRemove.forEach(id => this.classroomService.removeTeacher(this.assignClassroomId!, id).subscribe(() => this.loadClassrooms()));
    this.assignClassroomId = null;
    this.selectedTeacherIds = [];
  }

  cancelAssignTeacher() {
    this.assignClassroomId = null;
    this.selectedTeacherIds = [];
  }

  getTeacherEmailById(id: number): string {
    const teacher = this.teachers.find(t => t.id === id);
    return teacher ? teacher.email : '';
  }
} 