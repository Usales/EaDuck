import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'eaduck-theme';
  private themeSubject = new BehaviorSubject<Theme>('auto');
  
  public theme$ = this.themeSubject.asObservable();
  
  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    const theme = savedTheme || 'auto';
    this.setTheme(theme);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  toggleTheme(): void {
    const currentTheme = this.getCurrentTheme();
    let newTheme: Theme;
    
    switch (currentTheme) {
      case 'light':
        newTheme = 'dark';
        break;
      case 'dark':
        newTheme = 'auto';
        break;
      case 'auto':
      default:
        newTheme = 'light';
        break;
    }
    
    this.setTheme(newTheme);
  }

  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    
    // Remove existing theme classes
    htmlElement.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      htmlElement.classList.add(theme);
    }
    
    // Set data attribute for CSS
    htmlElement.setAttribute('data-theme', theme);
  }

  isDarkMode(): boolean {
    const currentTheme = this.getCurrentTheme();
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    
    // Auto mode - check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  isLightMode(): boolean {
    return !this.isDarkMode();
  }

  // Listen to system theme changes when in auto mode
  watchSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      if (this.getCurrentTheme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
}
