import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'eaduck-frontend';
  showHeader = true;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showHeader = !['/login', '/register', '/forgot-password'].includes(event.urlAfterRedirects);
      }
    });
  }

  ngOnInit(): void {
    // Initialize theme service and watch for system theme changes
    this.themeService.watchSystemTheme();
  }
}
