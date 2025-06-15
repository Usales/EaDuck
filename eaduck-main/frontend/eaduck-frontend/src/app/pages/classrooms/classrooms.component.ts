import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { ClassroomService, Classroom } from '../../services/classroom.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../services/user.service';

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

  constructor(private classroomService: ClassroomService, private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
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

  deleteClassroom(classroom: Classroom) {
    this.classroomService.deleteClassroom(classroom.id).subscribe(() => {
      this.classrooms = this.classrooms.filter(c => c.id !== classroom.id);
      this.applyFilter();
    });
  }

  createClassroom() {
    if (!this.newName || !this.newAcademicYear) return;
    this.classroomService.createClassroom({ name: this.newName, academicYear: this.newAcademicYear }).subscribe(newClass => {
      this.classrooms.push(newClass);
      this.applyFilter();
      this.newName = '';
      this.newAcademicYear = '';
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
}
