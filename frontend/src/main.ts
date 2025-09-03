import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { User } from './app/services/user.service';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

export interface Classroom {
  id: number;
  name: string;
  academicYear: string;
  teachers: User[];
  isActive: boolean;
  createdAt: string;
  students: User[];
}