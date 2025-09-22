import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
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
export class EmailConfirmationModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible = false;
  @Input() email = '';
  @Input() status: 'sending' | 'sent' | 'error' | 'verifying' = 'sending';
  @Input() errorMessage = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() resendRequested = new EventEmitter<void>();

  codeDigits: string[] = ['', '', '', '', '', ''];
  isCodeComplete = false;
  isCodeValid = false;
  isCodeInvalid = false;
  isResending = false;
  isVerifying = false;
  resendTimer = 7; // 7 segundos para reenviar
  private timerInterval?: number;

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    if (this.visible) {
      this.startResendTimer();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      // Limpar campos quando modal abrir
      this.resetForm();
      // Iniciar timer de 7 segundos
      this.startResendTimer();
      // Force theme application when modal becomes visible
      setTimeout(() => {
        this.applyTheme();
      }, 0);
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

  onDigitInput(index: number, event: any) {
    const value = event.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      event.target.value = this.codeDigits[index];
      return;
    }

    // Update the array
    this.codeDigits[index] = value;
    this.checkCodeComplete();

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = event.target.parentElement.children[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onKeyDown(index: number, event: KeyboardEvent) {
    // Handle backspace
    if (event.key === 'Backspace' && !this.codeDigits[index] && index > 0) {
      const prevInput = event.target as HTMLInputElement;
      const prevElement = prevInput.parentElement?.children[index - 1] as HTMLInputElement;
      if (prevElement) {
        prevElement.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    
    for (let i = 0; i < 6; i++) {
      this.codeDigits[i] = digits[i] || '';
    }
    
    this.checkCodeComplete();
    
    // Focus last filled input
    const lastFilledIndex = this.codeDigits.findIndex(digit => !digit) - 1;
    if (lastFilledIndex >= 0) {
      const inputs = (event.target as HTMLInputElement).parentElement?.children;
      if (inputs && inputs[lastFilledIndex]) {
        (inputs[lastFilledIndex] as HTMLInputElement).focus();
      }
    }
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
    this.resendTimer = 7; // 7 segundos
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
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.resendTimer = 0;
  }

  // Public methods to be called by parent component
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
}
