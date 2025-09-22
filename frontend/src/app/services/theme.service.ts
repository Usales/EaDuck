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
    this.watchSystemTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    const theme = savedTheme || 'auto';
    this.setTheme(theme);
  }

  setTheme(theme: Theme): void {
    console.log('ThemeService: Setting theme to:', theme);
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
    
    // Force update CSS variables
    this.updateCSSVariables(theme);
    
    // Force a reflow to ensure changes are applied
    htmlElement.offsetHeight;
  }

  private updateCSSVariables(theme: Theme): void {
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--text-primary', '#1E293B');
      root.style.setProperty('--text-secondary', '#1E293B');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', '#e2e8f0');
      root.style.setProperty('--accent-color', '#3b82f6');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-hover', '#2563eb');
      root.style.setProperty('--panel-bg', '#ffffff');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--input-border', '#d1d5db');
      root.style.setProperty('--input-text', '#1E293B');
      root.style.setProperty('--button-bg', '#3b82f6');
      root.style.setProperty('--button-text', '#ffffff');
      root.style.setProperty('--button-hover-bg', '#2563eb');
      root.style.setProperty('--link-color', '#3b82f6');
      root.style.setProperty('--accent-bg', '#dbeafe');
      root.style.setProperty('--success-bg', '#dcfce7');
      root.style.setProperty('--success-color', '#16a34a');
      root.style.setProperty('--error-bg', '#fef2f2');
      root.style.setProperty('--error-color', '#dc2626');
      root.style.setProperty('--modal-overlay', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--primary-color', '#3b82f6');
      root.style.setProperty('--primary-text', '#ffffff');
      root.style.setProperty('--info-bg', '#f0f9ff');
      root.style.setProperty('--info-text', '#0c4a6e');
    } else if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#0F172A');
      root.style.setProperty('--bg-secondary', '#1E293B');
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', '#334155');
      root.style.setProperty('--accent-color', '#60a5fa');
      root.style.setProperty('--accent-primary', '#3b82f6');
      root.style.setProperty('--accent-hover', '#2563eb');
      root.style.setProperty('--panel-bg', '#1E293B');
      root.style.setProperty('--input-bg', '#1E293B');
      root.style.setProperty('--input-border', '#334155');
      root.style.setProperty('--input-text', '#f1f5f9');
      root.style.setProperty('--button-bg', '#3b82f6');
      root.style.setProperty('--button-text', '#ffffff');
      root.style.setProperty('--button-hover-bg', '#2563eb');
      root.style.setProperty('--link-color', '#60a5fa');
      root.style.setProperty('--accent-bg', '#1e3a8a');
      root.style.setProperty('--success-bg', '#14532d');
      root.style.setProperty('--success-color', '#22c55e');
      root.style.setProperty('--error-bg', '#7f1d1d');
      root.style.setProperty('--error-color', '#ef4444');
      root.style.setProperty('--modal-overlay', 'rgba(0, 0, 0, 0.7)');
      root.style.setProperty('--primary-color', '#3b82f6');
      root.style.setProperty('--primary-text', '#ffffff');
      root.style.setProperty('--info-bg', '#1e3a8a');
      root.style.setProperty('--info-text', '#93c5fd');
    } else {
      // Auto mode - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.style.setProperty('--bg-primary', '#0F172A');
        root.style.setProperty('--bg-secondary', '#1E293B');
        root.style.setProperty('--text-primary', '#f1f5f9');
        root.style.setProperty('--text-secondary', '#94a3b8');
        root.style.setProperty('--border-color', '#334155');
        root.style.setProperty('--accent-color', '#60a5fa');
        root.style.setProperty('--panel-bg', '#1E293B');
        root.style.setProperty('--input-bg', '#1E293B');
        root.style.setProperty('--input-border', '#334155');
        root.style.setProperty('--input-text', '#f1f5f9');
        root.style.setProperty('--button-bg', '#3b82f6');
        root.style.setProperty('--button-text', '#ffffff');
        root.style.setProperty('--button-hover-bg', '#2563eb');
        root.style.setProperty('--link-color', '#60a5fa');
        root.style.setProperty('--accent-bg', '#1e3a8a');
        root.style.setProperty('--success-bg', '#14532d');
        root.style.setProperty('--success-color', '#22c55e');
        root.style.setProperty('--error-bg', '#7f1d1d');
        root.style.setProperty('--error-color', '#ef4444');
        root.style.setProperty('--modal-overlay', 'rgba(0, 0, 0, 0.7)');
        root.style.setProperty('--primary-color', '#3b82f6');
        root.style.setProperty('--primary-text', '#ffffff');
        root.style.setProperty('--info-bg', '#1e3a8a');
        root.style.setProperty('--info-text', '#93c5fd');
      } else {
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f8fafc');
        root.style.setProperty('--text-primary', '#1E293B');
        root.style.setProperty('--text-secondary', '#1E293B');
        root.style.setProperty('--text-muted', '#64748b');
        root.style.setProperty('--border-color', '#e2e8f0');
        root.style.setProperty('--accent-color', '#3b82f6');
        root.style.setProperty('--accent-primary', '#3b82f6');
        root.style.setProperty('--accent-hover', '#2563eb');
        root.style.setProperty('--panel-bg', '#ffffff');
        root.style.setProperty('--input-bg', '#ffffff');
        root.style.setProperty('--input-border', '#d1d5db');
        root.style.setProperty('--input-text', '#1E293B');
        root.style.setProperty('--button-bg', '#3b82f6');
        root.style.setProperty('--button-text', '#ffffff');
        root.style.setProperty('--button-hover-bg', '#2563eb');
        root.style.setProperty('--link-color', '#3b82f6');
        root.style.setProperty('--accent-bg', '#dbeafe');
        root.style.setProperty('--success-bg', '#dcfce7');
        root.style.setProperty('--success-color', '#16a34a');
        root.style.setProperty('--error-bg', '#fef2f2');
        root.style.setProperty('--error-color', '#dc2626');
        root.style.setProperty('--modal-overlay', 'rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--primary-color', '#3b82f6');
        root.style.setProperty('--primary-text', '#ffffff');
        root.style.setProperty('--info-bg', '#f0f9ff');
        root.style.setProperty('--info-text', '#0c4a6e');
      }
    }
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
        this.updateCSSVariables('auto');
      }
    });
  }
}
