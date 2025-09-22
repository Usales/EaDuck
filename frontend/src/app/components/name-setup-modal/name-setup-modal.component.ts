import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-name-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './name-setup-modal.component.html',
  styleUrls: ['./name-setup-modal.component.scss']
})
export class NameSetupModalComponent {
  @Input() isVisible = false;
  @Output() nameSet = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  userName = '';
  isLoading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  isDarkMode(): boolean {
    return this.themeService.getCurrentTheme() === 'dark';
  }

  onSubmit() {
    if (!this.userName.trim()) {
      this.error = 'Por favor, digite seu nome';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.authService.updateUserName(this.userName.trim()).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.nameSet.emit(response.name);
        this.userName = '';
        this.error = '';
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.error || 'Erro ao atualizar nome';
        console.error('Erro ao atualizar nome:', error);
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }
}
