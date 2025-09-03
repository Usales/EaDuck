import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-modal.component.html',
  styleUrls: ['./loading-modal.component.scss']
})
export class LoadingModalComponent {
  @Input() show = false;
  @Input() status: 'loading' | 'success' | 'error' = 'loading';
  @Input() message = '';
  @Input() successMessage = 'Tarefa cadastrada e e-mail enviado com sucesso!';
  @Input() errorMessage = 'Ocorreu um erro ao cadastrar a tarefa ou enviar o e-mail.';
} 