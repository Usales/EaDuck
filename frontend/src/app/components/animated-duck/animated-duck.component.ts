import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-duck',
  templateUrl: './animated-duck.component.html',
  styleUrls: ['./animated-duck.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AnimatedDuckComponent implements OnInit {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showWater: boolean = true;
  @Input() showReflection: boolean = true;
  @Input() animationSpeed: 'slow' | 'normal' | 'fast' = 'normal';
  @Input() expression: 'happy' | 'excited' | 'thinking' | 'sleeping' = 'happy';

  constructor() { }

  ngOnInit(): void {
  }

  onDuckClick(): void {
    // Trigger special animation on click
    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-clicked');
      setTimeout(() => {
        duckElement.classList.remove('duck-clicked');
      }, 1000);
    }
  }

  onDuckHover(): void {
    // Trigger hover animation
    const waterElement = document.querySelector('.water-ripple');
    if (waterElement) {
      waterElement.classList.add('ripple-active');
      setTimeout(() => {
        waterElement.classList.remove('ripple-active');
      }, 2000);
    }
  }
}
