import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" [ngClass]="{
      'max-w-md p-6': size === 'small',
      'max-w-lg p-8': size === 'medium',
      'max-w-2xl p-10': size === 'large'
    }">
      <div class="text-center mb-8">
        <img src="https://cdn-icons-png.flaticon.com/128/5404/5404967.png" alt="EaDuck Logo" class="mx-auto mb-4 w-12 h-12" />
        <h2 class="text-2xl font-bold text-white">{{ title }}</h2>
        <p class="text-gray-300 text-sm mt-2">{{ subtitle }}</p>
      </div>
      <div class="card-content">
        <ng-content></ng-content>
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
        width: 100%;
        min-height: 400px;
        display: flex;
        flex-direction: column;
        animation: fadeIn 0.5s ease-in-out;
      }

      .card-content {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      @media (max-width: 640px) {
        .card {
          max-width: 100%;
          min-height: 300px;
          padding: 1.5rem !important;
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
}