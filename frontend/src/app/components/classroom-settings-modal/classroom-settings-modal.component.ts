import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-classroom-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classroom-settings-modal.component.html',
  styleUrls: ['./classroom-settings-modal.component.scss']
})
export class ClassroomSettingsModalComponent {
  @Input() isVisible = false;
  @Input() classroom: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() classroomUpdated = new EventEmitter<any>();

  classroomName = '';
  academicYear = '';
  isActive = true;
  isLoading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnChanges() {
    if (this.classroom) {
      this.classroomName = this.classroom.name || '';
      this.academicYear = this.classroom.academicYear || '';
      this.isActive = this.classroom.isActive !== undefined ? this.classroom.isActive : true;
    }
  }

  isDarkMode(): boolean {
    return this.themeService.getCurrentTheme() === 'dark';
  }

  onSubmit() {
    if (!this.classroomName.trim()) {
      this.error = 'Por favor, digite o nome da sala';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const updateData = {
      name: this.classroomName.trim(),
      academicYear: this.academicYear,
      isActive: this.isActive
    };

    this.http.put(`http://localhost:8080/api/classrooms/${this.classroom.id}`, updateData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (updatedClassroom: any) => {
        this.isLoading = false;
        this.classroomUpdated.emit(updatedClassroom);
        this.close.emit();
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.message || 'Erro ao atualizar sala';
        console.error('Erro ao atualizar sala:', error);
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSubmit();
      return;
    }
    
    // Para o campo academicYear, permitir apenas números
    if ((event.target as HTMLInputElement).id === 'academicYear') {
      // Permitir apenas números (0-9), backspace, delete, tab, escape, enter, setas
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      
      if (allowedKeys.includes(event.key)) {
        return;
      }
      
      // Permitir apenas números
      if (event.key >= '0' && event.key <= '9') {
        return;
      }
      
      // Bloquear todas as outras teclas (letras, símbolos, etc.)
      event.preventDefault();
    }
  }

  onYearInput(event: any) {
    let value = event.target.value;
    // Remover caracteres não numéricos
    value = value.replace(/[^0-9]/g, '');
    // Limitar a 4 dígitos
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    event.target.value = value;
    this.academicYear = value;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
