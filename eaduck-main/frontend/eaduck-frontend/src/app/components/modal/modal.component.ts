import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-[#232b3e] rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-white">{{ title }}</h2>
          <button (click)="onClose()" class="text-gray-400 hover:text-white">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="text-gray-300 mb-6">
          {{ message }}
        </div>
        <div class="flex justify-end">
          <button (click)="onClose()" 
                  [class]="getButtonClass()"
                  class="px-4 py-2 text-white rounded-lg transition-all">
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ModalComponent {
  @Input() set visible(value: boolean) {
    this.isOpen = value;
  }
  @Input() isOpen = false;
  @Input() title = 'Atenção';
  @Input() message = '';
  @Input() buttonText = 'OK';
  @Input() type: 'success' | 'error' | 'info' | 'warning' | 'loading' = 'info';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  getButtonClass(): string {
    switch (this.type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'loading':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700';
    }
  }
}
