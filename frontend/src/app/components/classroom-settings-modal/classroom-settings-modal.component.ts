import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
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
export class ClassroomSettingsModalComponent implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    // Quando o modal é aberto (isVisible muda para true) ou quando classroom muda
    if (changes['isVisible'] && changes['isVisible'].currentValue === true && this.classroom) {
      this.initializeFromClassroom();
    }
    if (changes['classroom'] && changes['classroom'].currentValue) {
      this.initializeFromClassroom();
    }
  }

  private initializeFromClassroom(): void {
    if (this.classroom) {
      console.log('[CLASSROOM-SETTINGS] Inicializando modal com dados da sala:', this.classroom);
      this.classroomName = this.classroom.name || '';
      this.academicYear = this.classroom.academicYear || '';
      // Garantir que isActive seja boolean explícito
      const originalIsActive = this.classroom.isActive;
      console.log('[CLASSROOM-SETTINGS] isActive original da sala:', originalIsActive, 'tipo:', typeof originalIsActive);
      this.isActive = this.classroom.isActive !== undefined && this.classroom.isActive !== null 
        ? Boolean(this.classroom.isActive) 
        : true;
      console.log('[CLASSROOM-SETTINGS] isActive definido no componente:', this.isActive, 'tipo:', typeof this.isActive);
    }
  }

  isDarkMode(): boolean {
    return this.themeService.getCurrentTheme() === 'dark';
  }

  onSubmit() {
    // Garantir que isActive seja boolean explícito
    const isActiveValue = Boolean(this.isActive);

    console.log('[CLASSROOM-SETTINGS] ===== INICIANDO ATUALIZAÇÃO DA SALA =====');
    console.log('[CLASSROOM-SETTINGS] Classroom ID:', this.classroom?.id);
    console.log('[CLASSROOM-SETTINGS] Valor isActive atual no componente:', this.isActive);
    console.log('[CLASSROOM-SETTINGS] Valor isActive atual na sala original:', this.classroom?.isActive);
    console.log('[CLASSROOM-SETTINGS] Valor isActiveValue que será enviado:', isActiveValue);
    console.log('[CLASSROOM-SETTINGS] Tipo de isActiveValue:', typeof isActiveValue);

    if (!this.classroomName.trim()) {
      this.error = 'Por favor, digite o nome da sala';
      return;
    }

    if (!this.classroom?.id) {
      this.error = 'Erro: ID da sala não encontrado';
      console.error('[CLASSROOM-SETTINGS] ERRO: ID da sala não encontrado');
      return;
    }

    this.isLoading = true;
    this.error = '';

    const updateData = {
      name: this.classroomName.trim(),
      academicYear: this.academicYear,
      isActive: isActiveValue
    };

    console.log('[CLASSROOM-SETTINGS] Payload completo a ser enviado:', JSON.stringify(updateData, null, 2));
    console.log('[CLASSROOM-SETTINGS] URL da requisição:', `http://localhost:8080/api/classrooms/${this.classroom.id}`);

    this.http.put(`http://localhost:8080/api/classrooms/${this.classroom.id}`, updateData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (updatedClassroom: any) => {
        console.log('[CLASSROOM-SETTINGS] ===== RESPOSTA DO BACKEND RECEBIDA =====');
        console.log('[CLASSROOM-SETTINGS] Resposta completa:', JSON.stringify(updatedClassroom, null, 2));
        console.log('[CLASSROOM-SETTINGS] isActive retornado pelo backend:', updatedClassroom.isActive);
        console.log('[CLASSROOM-SETTINGS] Tipo de isActive retornado:', typeof updatedClassroom.isActive);
        
        // Garantir que o isActive retornado seja boolean
        if (updatedClassroom.isActive !== undefined && updatedClassroom.isActive !== null) {
          updatedClassroom.isActive = Boolean(updatedClassroom.isActive);
          console.log('[CLASSROOM-SETTINGS] isActive convertido para boolean:', updatedClassroom.isActive);
        } else {
          console.warn('[CLASSROOM-SETTINGS] ATENÇÃO: isActive não veio na resposta do backend!');
        }
        
        this.isLoading = false;
        // Emitir o evento com a sala atualizada
        this.classroomUpdated.emit(updatedClassroom);
        // Fechar o modal
        this.close.emit();
        console.log('[CLASSROOM-SETTINGS] ===== ATUALIZAÇÃO CONCLUÍDA =====');
      },
      error: (error) => {
        console.error('[CLASSROOM-SETTINGS] ===== ERRO NA ATUALIZAÇÃO =====');
        console.error('[CLASSROOM-SETTINGS] Status do erro:', error?.status);
        console.error('[CLASSROOM-SETTINGS] Erro completo:', error);
        console.error('[CLASSROOM-SETTINGS] Mensagem de erro:', error.error?.message || error.message);
        console.error('[CLASSROOM-SETTINGS] Body do erro:', error.error);
        
        this.isLoading = false;
        if (error?.status === 0) {
          this.error = 'Erro de conexão. Verifique se o backend está rodando.';
        } else if (error?.status === 403) {
          this.error = 'Você não tem permissão para atualizar esta sala.';
        } else if (error?.status >= 500) {
          this.error = 'Erro interno do servidor. Tente novamente mais tarde.';
        } else {
          this.error = error.error?.message || 'Erro ao atualizar sala';
        }
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
