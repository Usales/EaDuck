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
    const user = this.authService.getCurrentUser();
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

  loadStudents() {
    this.userService.getUsersByRole('STUDENT').subscribe(students => {
      this.students = students;
    });
  }

  openAssignTeacher(classroom: Classroom) {
    this.assignClassroomId = classroom.id;
    this.assignMode = 'teacher';
    this.selectedTeacherIds = classroom.teachers ? classroom.teachers.map((t: any) => t.id) : [];
    this.searchTeacher = '';
    this.filteredTeachers = this.teachers;
  }

  openAssignStudent(classroom: Classroom) {
    this.assignClassroomId = classroom.id;
    this.assignMode = 'student';
    this.selectedStudentIds = classroom.students ? classroom.students.map((s: any) => s.id) : [];
    this.searchStudent = '';
    this.filteredStudents = this.students;
  }

  filterTeachers() {
    const search = this.searchTeacher.toLowerCase();
    this.filteredTeachers = this.teachers.filter(t => t.email.toLowerCase().includes(search) && !this.selectedTeacherIds.includes(t.id));
  }

  filterStudents() {
    const search = this.searchStudent.toLowerCase();
    this.filteredStudents = this.students.filter(s => s.email.toLowerCase().includes(search) && !this.selectedStudentIds.includes(s.id));
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

  saveStudents() {
    if (!this.assignClassroomId) return;
    const classroom = this.classrooms.find(c => c.id === this.assignClassroomId);
    if (!classroom) return;
    // Adiciona alunos que não estão na sala
    const toAdd = this.selectedStudentIds.filter(id => !classroom.students?.some((s: any) => s.id === id));
    // Remove alunos que foram desmarcados
    const toRemove = (classroom.students || []).filter((s: any) => !this.selectedStudentIds.includes(s.id)).map((s: any) => s.id);
    toAdd.forEach(id => this.classroomService.addStudent(this.assignClassroomId!, id).subscribe(() => this.loadClassrooms()));
    toRemove.forEach(id => this.classroomService.removeStudent(this.assignClassroomId!, id).subscribe(() => this.loadClassrooms()));
    this.assignClassroomId = null;
    this.selectedStudentIds = [];
    this.assignMode = null;
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

  getStudentEmailById(id: number): string {
    const student = this.students.find(s => s.id === id);
    return student ? student.email : '';
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
} 