import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';

export interface EmailConfirmationData {
  email: string;
  code: string;
}

@Component({
  selector: 'app-email-confirmation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-confirmation-modal.component.html',
  styleUrls: ['./email-confirmation-modal.component.scss']
})
export class EmailConfirmationModalComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() visible = false;
  @Input() email = '';
  @Input() status: 'sending' | 'sent' | 'error' | 'verifying' = 'sending';
  @Input() errorMessage = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() resendRequested = new EventEmitter<void>();

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  codeDigits: string[] = ['', '', '', '', '', ''];
  isCodeComplete = false;
  isCodeValid = false;
  isCodeInvalid = false;
  isResending = false;
  isVerifying = false;
  resendTimer = 7;
  private timerInterval?: number;
  private isProcessingInput = false;

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    if (this.visible) {
      this.startResendTimer();
    }
  }

  ngAfterViewInit() {
    if (this.visible && (this.status === 'sent' || this.status === 'verifying')) {
      setTimeout(() => this.focusInput(0), 200);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      this.resetForm();
      this.startResendTimer();
      setTimeout(() => {
        this.applyTheme();
        if (this.status === 'sent' || this.status === 'verifying') {
          this.focusInput(0);
        }
      }, 200);
    }
    
    if (changes['status'] && this.visible && (this.status === 'sent' || this.status === 'verifying')) {
      setTimeout(() => this.focusInput(0), 200);
    }
  }

  private applyTheme() {
    const currentTheme = this.themeService.getCurrentTheme();
    this.themeService.setTheme(currentTheme);
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  onClose() {
    this.close.emit();
    this.resetForm();
  }

  onInputFocus(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    // Selecionar o texto quando focar para facilitar a substituição
    setTimeout(() => input.select(), 10);
  }

  onDigitInput(index: number, event: Event) {
    if (this.isProcessingInput) {
      event.preventDefault();
      return;
    }

    this.isProcessingInput = true;
    const input = event.target as HTMLInputElement;
    
    // Obter o valor atual do input
    let inputValue = input.value;
    
    // Limpar qualquer caractere não numérico
    inputValue = inputValue.replace(/\D/g, '');
    
    // Se vazio, limpar tudo
    if (inputValue === '') {
      this.codeDigits[index] = '';
      input.value = '';
      this.checkCodeComplete();
      this.isProcessingInput = false;
      return;
    }
    
    // Pegar APENAS o último caractere (prevenir múltiplos dígitos)
    const lastChar = inputValue.slice(-1);
    
    // Atualizar o array
    this.codeDigits[index] = lastChar;
    
    // Forçar o valor do input para ser exatamente um dígito
    input.value = lastChar;
    
    // Selecionar o texto para facilitar substituição
    input.setSelectionRange(0, 1);
    
    // Mover para o próximo campo se digitou um número válido
    if (lastChar && index < 5) {
      setTimeout(() => {
        this.focusInput(index + 1);
      }, 20);
    }
    
    this.checkCodeComplete();
    
    // Liberar processamento após um pequeno delay
    setTimeout(() => {
      this.isProcessingInput = false;
    }, 100);
  }

  onKeyDown(index: number, event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    
    // Backspace
    if (event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      
      if (input.value === '' && index > 0) {
        // Campo vazio - voltar para o anterior e limpar
        this.codeDigits[index - 1] = '';
        const prevInput = this.codeInputs.toArray()[index - 1];
        if (prevInput?.nativeElement) {
          prevInput.nativeElement.value = '';
        }
        this.focusInput(index - 1);
      } else {
        // Limpar campo atual
        this.codeDigits[index] = '';
        input.value = '';
      }
      
      this.checkCodeComplete();
      return;
    }
    
    // Delete - similar ao backspace
    if (event.key === 'Delete') {
      event.preventDefault();
      this.codeDigits[index] = '';
      input.value = '';
      this.checkCodeComplete();
      return;
    }
    
    // Setas
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }
    
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focusInput(index + 1);
      return;
    }
    
    // Se for um número, permitir (será processado no input event)
    if (event.key >= '0' && event.key <= '9') {
      // Permitir que o evento continue normalmente
      return;
    }
    
    // Bloquear todas as outras teclas exceto atalhos de sistema
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      // Permitir Tab, Enter, Escape
      if (event.key !== 'Tab' && event.key !== 'Enter' && event.key !== 'Escape') {
        event.preventDefault();
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isProcessingInput) {
      return;
    }
    
    this.isProcessingInput = true;
    
    const pastedText = event.clipboardData?.getData('text') || '';
    const digits = pastedText.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 0) {
      this.isProcessingInput = false;
      return;
    }
    
    // Limpar todos os campos primeiro
    this.codeDigits = ['', '', '', '', '', ''];
    
    // Preencher com os dígitos colados
    const inputArray = this.codeInputs.toArray();
    for (let i = 0; i < digits.length && i < 6; i++) {
      this.codeDigits[i] = digits[i];
      if (inputArray[i]?.nativeElement) {
        inputArray[i].nativeElement.value = digits[i];
      }
    }
    
    // Limpar campos restantes
    for (let i = digits.length; i < 6; i++) {
      if (inputArray[i]?.nativeElement) {
        inputArray[i].nativeElement.value = '';
      }
    }
    
    // Focar no próximo campo vazio ou no último
    const nextEmptyIndex = this.codeDigits.findIndex(d => d === '');
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    
    setTimeout(() => {
      this.focusInput(focusIndex);
      this.isProcessingInput = false;
    }, 50);
    
    this.checkCodeComplete();
  }

  private setInputValue(index: number, value: string) {
    setTimeout(() => {
      const inputArray = this.codeInputs.toArray();
      if (inputArray[index]?.nativeElement) {
        inputArray[index].nativeElement.value = value;
      }
    }, 0);
  }

  private focusInput(index: number) {
    setTimeout(() => {
      const inputArray = this.codeInputs.toArray();
      if (inputArray[index]?.nativeElement) {
        inputArray[index].nativeElement.focus();
        inputArray[index].nativeElement.select();
      }
    }, 0);
  }

  private checkCodeComplete() {
    this.isCodeComplete = this.codeDigits.every(digit => digit !== '');
    this.isCodeValid = false;
    this.isCodeInvalid = false;
  }

  onSubmitCode() {
    if (!this.isCodeComplete) return;

    this.isVerifying = true;
    const code = this.codeDigits.join('');
    this.codeSubmitted.emit(code);
  }

  resendCode() {
    if (this.isResending || this.resendTimer > 0) return;

    this.isResending = true;
    this.resendRequested.emit();
  }

  private startResendTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    this.resendTimer = 7;
    this.timerInterval = window.setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = undefined;
      }
    }, 1000);
  }

  private resetForm() {
    this.codeDigits = ['', '', '', '', '', ''];
    this.isCodeComplete = false;
    this.isCodeValid = false;
    this.isCodeInvalid = false;
    this.isResending = false;
    this.isVerifying = false;
    this.isProcessingInput = false;
    
    // Limpar todos os inputs
    setTimeout(() => {
      if (this.codeInputs) {
        this.codeInputs.forEach((inputRef, index) => {
          if (inputRef?.nativeElement) {
            inputRef.nativeElement.value = '';
            this.codeDigits[index] = '';
          }
        });
      }
    }, 0);
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.resendTimer = 0;
  }

  setCodeValid(valid: boolean) {
    this.isCodeValid = valid;
    this.isCodeInvalid = !valid;
    this.isVerifying = false;
  }

  setResending(active: boolean) {
    this.isResending = active;
    if (active) {
      this.startResendTimer();
    }
  }

  setVerifying(active: boolean) {
    this.isVerifying = active;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
