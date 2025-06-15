import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SidebarComponent, NgApexchartsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  totalUsers = 0;
  totalClassrooms = 0;
  totalNotifications = 0;
  totalTasks = 0;
  usersByRole: { [role: string]: number } = {};

  chartOptions: any = {};

  constructor(private userService: UserService, private http: HttpClient) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.userService.getAllUsers().subscribe(users => {
      this.totalUsers = users.length;
      this.usersByRole = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as { [role: string]: number });
      this.updateChart();
    });
    this.http.get<any[]>('http://localhost:8080/api/classrooms').subscribe(res => this.totalClassrooms = res.length);
    this.http.get<any[]>('http://localhost:8080/api/notifications').subscribe(res => this.totalNotifications = res.length);
    this.http.get<any[]>('http://localhost:8080/api/tasks').subscribe(res => this.totalTasks = res.length);
  }

  updateChart() {
    this.chartOptions = {
      chart: { type: 'pie' },
      labels: Object.keys(this.usersByRole),
      series: Object.values(this.usersByRole),
      colors: ['#6366f1', '#22d3ee', '#f59e42'],
      legend: { labels: { colors: '#fff' } },
      dataLabels: { style: { colors: ['#fff'] } }
    };
  }
}
