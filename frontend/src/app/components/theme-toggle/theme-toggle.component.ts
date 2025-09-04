import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'auto';
  private themeSubscription?: Subscription;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      case 'auto':
      default:
        return 'auto';
    }
  }

  getThemeLabel(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'Modo Claro';
      case 'dark':
        return 'Modo Escuro';
      case 'auto':
      default:
        return 'Automático';
    }
  }
}
