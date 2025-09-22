import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../services/theme.service';

export interface CreateChatData {
  name: string;
  academicYear: string;
  description: string;
  teacherIds: number[];
}

@Component({
  selector: 'app-create-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-chat-modal.component.html',
  styleUrls: ['./create-chat-modal.component.scss']
})
export class CreateChatModalComponent implements OnInit {
  @Input() visible = false;
  @Input() isAdmin = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() chatCreated = new EventEmitter<any>();

  // Form data
  chatData: CreateChatData = {
    name: '',
    academicYear: '',
    description: '',
    teacherIds: []
  };

  // Available teachers for selection
  availableTeachers: any[] = [];
  selectedTeachers: any[] = [];

  // Form state
  isSubmitting = false;
  errorMessage = '';

  // Academic years - removido array fixo para permitir digitação livre

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    if (this.visible) {
      this.loadTeachers();
    }
  }

  ngOnChanges(changes: any) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
      this.loadTeachers();
    }
  }

  private loadTeachers() {
    if (this.isAdmin) {
      this.http.get<any[]>('http://localhost:8080/api/users/teachers').subscribe({
        next: (teachers) => {
          this.availableTeachers = teachers;
        },
        error: (error) => {
          console.error('Erro ao carregar professores:', error);
        }
      });
    }
  }

  onTeacherToggle(teacher: any) {
    const index = this.selectedTeachers.findIndex(t => t.id === teacher.id);
    if (index > -1) {
      this.selectedTeachers.splice(index, 1);
    } else {
      this.selectedTeachers.push(teacher);
    }
    this.chatData.teacherIds = this.selectedTeachers.map(t => t.id);
  }

  isTeacherSelected(teacher: any): boolean {
    return this.selectedTeachers.some(t => t.id === teacher.id);
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      ...this.chatData,
      teacherIds: this.selectedTeachers.map(t => t.id)
    };

    this.http.post('http://localhost:8080/api/classrooms', payload).subscribe({
      next: (response) => {
        console.log('Sala criada com sucesso:', response);
        this.chatCreated.emit(response);
        this.closeModal();
      },
      error: (error) => {
        console.error('Erro ao criar sala:', error);
        this.errorMessage = error.error?.message || 'Erro ao criar sala de aula';
        this.isSubmitting = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.chatData.name.trim()) {
      this.errorMessage = 'Nome da sala é obrigatório';
      return false;
    }
    if (!this.chatData.academicYear || this.chatData.academicYear.length !== 4) {
      this.errorMessage = 'Ano letivo deve ter 4 dígitos (ex: 2025)';
      return false;
    }
    if (this.isAdmin && this.selectedTeachers.length === 0) {
      this.errorMessage = 'Selecione pelo menos um professor';
      return false;
    }
    return true;
  }

  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  private resetForm() {
    this.chatData = {
      name: '',
      academicYear: '',
      description: '',
      teacherIds: []
    };
    this.selectedTeachers = [];
    this.errorMessage = '';
    this.isSubmitting = false;
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  onKeyPress(event: KeyboardEvent): boolean {
    // Permitir apenas números (0-9), backspace, delete, tab, escape, enter
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'];
    const isNumber = event.key >= '0' && event.key <= '9';
    const isAllowedKey = allowedKeys.includes(event.key);
    
    if (!isNumber && !isAllowedKey) {
      event.preventDefault();
      return false;
    }
    
    return true;
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
    this.chatData.academicYear = value;
  }
}
