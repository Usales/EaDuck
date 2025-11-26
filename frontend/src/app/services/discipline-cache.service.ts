import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DisciplineService, Discipline } from './discipline.service';

@Injectable({
  providedIn: 'root'
})
export class DisciplineCacheService {
  private disciplinesSubject = new BehaviorSubject<Discipline[]>([]);
  public disciplines$ = this.disciplinesSubject.asObservable();
  private lastUpdate = 0;
  private readonly CACHE_DURATION = 30000; // 30 segundos

  constructor(private disciplineService: DisciplineService) {
    this.loadDisciplines();
  }

  loadDisciplines(force = false): void {
    const now = Date.now();
    if (!force && (now - this.lastUpdate) < this.CACHE_DURATION && this.disciplinesSubject.value.length > 0) {
      return; // Usar cache se ainda válido
    }

    this.disciplineService.getAllDisciplines(true).subscribe({
      next: (disciplines) => {
        const activeDisciplines = disciplines.filter(d => d.isActive !== false);
        this.disciplinesSubject.next(activeDisciplines);
        this.lastUpdate = now;
      },
      error: (error) => {
        console.error('Erro ao carregar disciplinas:', error);
      }
    });
  }

  refreshDisciplines(): void {
    this.loadDisciplines(true);
  }

  getDisciplines(): Discipline[] {
    return this.disciplinesSubject.value;
  }
}

