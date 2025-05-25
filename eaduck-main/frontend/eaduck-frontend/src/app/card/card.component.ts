import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Outer card div with expanded background for size="large" -->
    <div class="card" [ngClass]="{
      'max-w-md p-6': size === 'small',
      'max-w-lg p-8': size === 'medium',
      'w-full max-w-none p-12 min-h-[90vh]': size === 'large'
    }">
      <!-- Inner card div to maintain content size -->
      <div class="card-inner" [ngClass]="{
        'max-w-md min-h-[60vh]': size === 'small',
        'max-w-lg min-h-[70vh]': size === 'medium',
        'w-11/12 max-w-7xl min-h-[80vh]': size === 'large'
      }">
        <div class="text-center mb-8">
          <img src="https://cdn-icons-png.flaticon.com/128/5404/5404967.png" alt="EaDuck Logo" class="mx-auto mb-4 w-12 h-12" />
          <h2 class="text-3xl font-bold text-gray-800 mb-4">{{ title }}</h2>
          <p class="text-gray-400 text-base mb-6">{{ subtitle }}</p>
        </div>
        <div class="card-content">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.5s ease-in-out;
      }

      .card-inner {
        width: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 0.75rem;
      }

      .card-content {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
      }

      @media (max-width: 1024px) {
        .card {
          width: 100%;
          padding: 2rem !important;
          min-height: 80vh !important;
        }
        .card-inner {
          width: 95%;
          min-height: 70vh !important;
        }
      }

      @media (max-width: 640px) {
        .card {
          width: 100%;
          padding: 1.5rem !important;
          min-height: 70vh !important;
        }
        .card-inner {
          width: 100%;
          min-height: 60vh !important;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
  ]
})
export class CardComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() subtitleColor: string = 'text-gray-600'; // Cor padrão
}