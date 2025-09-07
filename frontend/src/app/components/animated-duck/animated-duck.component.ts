import { Component, Input, OnInit, HostListener } from '@angular/core';
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
  @Input() expression: 'happy' | 'excited' | 'thinking' | 'sleeping' | 'surprised' | 'angry' | 'love' = 'happy';
  @Input() duckColor: 'yellow' | 'white' | 'orange' | 'pink' = 'yellow';
  @Input() enableSoundEffects: boolean = true;

  clickCount: number = 0;
  private clickTimer: any;
  isDragging: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;
  currentPosition = { x: 0, y: 0 };
  isEasterEggActive: boolean = false;
  private easterEggSequence: string[] = [];
  private easterEggCode: string[] = ['click', 'click', 'double-click', 'hover'];

  constructor() { }

  ngOnInit(): void {
  }

  onDuckClick(): void {
    this.clickCount++;
    this.easterEggSequence.push('click');

    // Trigger special animation on click
    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-clicked');
      setTimeout(() => {
        duckElement.classList.remove('duck-clicked');
      }, 1000);
    }

    // Multiple click effects
    if (this.clickCount === 3) {
      this.triggerTripleClick();
      this.clickCount = 0;
    } else {
      clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        this.clickCount = 0;
      }, 500);
    }

    // Check easter egg
    this.checkEasterEgg();

    // Sound effect simulation
    if (this.enableSoundEffects) {
      this.playSoundEffect('quack');
    }
  }

  onDuckDoubleClick(): void {
    this.easterEggSequence.push('double-click');
    this.checkEasterEgg();

    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-double-clicked');
      setTimeout(() => {
        duckElement.classList.remove('duck-double-clicked');
      }, 1500);
    }

    if (this.enableSoundEffects) {
      this.playSoundEffect('double-quack');
    }
  }

  onDuckHover(): void {
    this.easterEggSequence.push('hover');
    this.checkEasterEgg();

    // Trigger hover animation
    const waterElement = document.querySelector('.water-ripple');
    if (waterElement) {
      waterElement.classList.add('ripple-active');
      setTimeout(() => {
        waterElement.classList.remove('ripple-active');
      }, 2000);
    }

    // Random hover effects
    if (Math.random() > 0.7) {
      this.triggerRandomHoverEffect();
    }
  }

  onDuckMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX - this.currentPosition.x;
    this.dragStartY = event.clientY - this.currentPosition.y;

    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-dragging');
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.currentPosition.x = event.clientX - this.dragStartX;
      this.currentPosition.y = event.clientY - this.dragStartY;

      const duckElement = document.querySelector('.duck-container') as HTMLElement;
      if (duckElement) {
        duckElement.style.transform = `translate(${this.currentPosition.x}px, ${this.currentPosition.y}px)`;
      }
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      const duckElement = document.querySelector('.duck-container');
      if (duckElement) {
        duckElement.classList.remove('duck-dragging');
        duckElement.classList.add('duck-dropped');
        setTimeout(() => {
          duckElement.classList.remove('duck-dropped');
          (duckElement as HTMLElement).style.transform = '';
          this.currentPosition = { x: 0, y: 0 };
        }, 500);
      }
    }
  }

  private triggerTripleClick(): void {
    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-triple-clicked');
      setTimeout(() => {
        duckElement.classList.remove('duck-triple-clicked');
      }, 2000);
    }

    if (this.enableSoundEffects) {
      this.playSoundEffect('triple-quack');
    }
  }

  private triggerRandomHoverEffect(): void {
    const effects = ['sparkle', 'bounce', 'twist'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];

    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add(`duck-${randomEffect}`);
      setTimeout(() => {
        duckElement.classList.remove(`duck-${randomEffect}`);
      }, 1000);
    }
  }

  private checkEasterEgg(): void {
    if (this.easterEggSequence.length > this.easterEggCode.length) {
      this.easterEggSequence.shift();
    }

    if (this.easterEggSequence.length === this.easterEggCode.length &&
        this.easterEggSequence.every((action, index) => action === this.easterEggCode[index])) {
      this.activateEasterEgg();
      this.easterEggSequence = [];
    }
  }

  private activateEasterEgg(): void {
    this.isEasterEggActive = true;
    const duckElement = document.querySelector('.duck-container');
    if (duckElement) {
      duckElement.classList.add('duck-easter-egg');
      setTimeout(() => {
        duckElement.classList.remove('duck-easter-egg');
        this.isEasterEggActive = false;
      }, 5000);
    }

    if (this.enableSoundEffects) {
      this.playSoundEffect('easter-egg');
    }
  }

  private playSoundEffect(sound: string): void {
    // Simulate sound with visual feedback
    const soundIndicator = document.querySelector('.sound-indicator');
    if (soundIndicator) {
      (soundIndicator as HTMLElement).textContent = this.getSoundText(sound);
      soundIndicator.classList.add('sound-active');
      setTimeout(() => {
        soundIndicator.classList.remove('sound-active');
      }, 1000);
    }
  }

  private getSoundText(sound: string): string {
    const sounds = {
      'quack': 'Quack!',
      'double-quack': 'Quack Quack!',
      'triple-quack': 'QUACK QUACK QUACK!',
      'easter-egg': '🎉 SPECIAL QUACK! 🎉'
    };
    return sounds[sound as keyof typeof sounds] || 'Quack!';
  }

  getDuckColorClass(): string {
    return `duck-color-${this.duckColor}`;
  }

  changeSize(newSize: 'small' | 'medium' | 'large'): void {
    this.size = newSize;
  }

  changeColor(newColor: 'yellow' | 'white' | 'orange' | 'pink'): void {
    this.duckColor = newColor;
  }

  changeExpression(newExpression: 'happy' | 'excited' | 'thinking' | 'sleeping' | 'surprised' | 'angry' | 'love'): void {
    this.expression = newExpression;
  }

  changeAnimationSpeed(newSpeed: 'slow' | 'normal' | 'fast'): void {
    this.animationSpeed = newSpeed;
  }

  toggleWater(): void {
    this.showWater = !this.showWater;
  }

  toggleReflection(): void {
    this.showReflection = !this.showReflection;
  }

  toggleSound(): void {
    this.enableSoundEffects = !this.enableSoundEffects;
  }
}
