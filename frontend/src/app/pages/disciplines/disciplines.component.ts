import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DisciplineService, Discipline } from '../../services/discipline.service';
import { DisciplineCacheService } from '../../services/discipline-cache.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.service';

@Component({
  selector: 'app-disciplines',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './disciplines.component.html',
  styleUrl: './disciplines.component.scss'
})
export class DisciplinesComponent implements OnInit {
  disciplines: Discipline[] = [];
  filteredDisciplines: Discipline[] = [];
  filter = '';
  
  showNewForm = false;
  showEditForm = false;
  editingDiscipline: Discipline | null = null;
  
  newDiscipline: { name: string; description: string } = {
    name: '',
    description: ''
  };
  
  editDiscipline: { name: string; description: string; isActive: boolean } = {
    name: '',
    description: '',
    isActive: true
  };
  
  loading = false;
  saving = false;
  currentUser: User | null = null;
  canEdit = false;

  constructor(
    private disciplineService: DisciplineService,
    private disciplineCacheService: DisciplineCacheService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.canEdit = user?.role === 'ADMIN' || user?.role === 'TEACHER';
    });
    this.loadDisciplines();
  }

  loadDisciplines() {
    this.loading = true;
    this.disciplineService.getAllDisciplines().subscribe({
      next: (disciplines) => {
        this.disciplines = disciplines;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar disciplinas:', error);
        alert('Erro ao carregar disciplinas');
        this.loading = false;
      }
    });
  }

  applyFilter() {
    if (!this.filter.trim()) {
      this.filteredDisciplines = this.disciplines;
      return;
    }
    
    const filterLower = this.filter.toLowerCase();
    this.filteredDisciplines = this.disciplines.filter(d => 
      d.name.toLowerCase().includes(filterLower) ||
      (d.description && d.description.toLowerCase().includes(filterLower))
    );
  }

  openNewForm() {
    this.newDiscipline = { name: '', description: '' };
    this.showNewForm = true;
    this.showEditForm = false;
  }

  closeNewForm() {
    this.showNewForm = false;
    this.newDiscipline = { name: '', description: '' };
  }

  openEditForm(discipline: Discipline) {
    this.editingDiscipline = discipline;
    this.editDiscipline = {
      name: discipline.name,
      description: discipline.description || '',
      isActive: discipline.isActive ?? true
    };
    this.showEditForm = true;
    this.showNewForm = false;
  }

  closeEditForm() {
    this.showEditForm = false;
    this.editingDiscipline = null;
    this.editDiscipline = { name: '', description: '', isActive: true };
  }

  saveNewDiscipline() {
    if (!this.newDiscipline.name.trim()) {
      alert('Por favor, preencha o nome da disciplina');
      return;
    }

    this.saving = true;
    this.disciplineService.createDiscipline(this.newDiscipline).subscribe({
      next: () => {
        alert('Disciplina criada com sucesso!');
        this.closeNewForm();
        this.loadDisciplines();
        // Atualizar cache para sincronizar com outras telas
        this.disciplineCacheService.refreshDisciplines();
        this.saving = false;
      },
      error: (error) => {
        console.error('Erro ao criar disciplina:', error);
        const errorMsg = error.error?.error || 'Erro ao criar disciplina';
        alert(errorMsg);
        this.saving = false;
      }
    });
  }

  saveEditDiscipline() {
    if (!this.editDiscipline.name.trim()) {
      alert('Por favor, preencha o nome da disciplina');
      return;
    }

    if (!this.editingDiscipline?.id) {
      alert('Erro: ID da disciplina não encontrado');
      return;
    }

    this.saving = true;
    this.disciplineService.updateDiscipline(this.editingDiscipline.id, this.editDiscipline).subscribe({
      next: () => {
        alert('Disciplina atualizada com sucesso!');
        this.closeEditForm();
        this.loadDisciplines();
        // Atualizar cache para sincronizar com outras telas
        this.disciplineCacheService.refreshDisciplines();
        this.saving = false;
      },
      error: (error) => {
        console.error('Erro ao atualizar disciplina:', error);
        const errorMsg = error.error?.error || 'Erro ao atualizar disciplina';
        alert(errorMsg);
        this.saving = false;
      }
    });
  }

  toggleActive(discipline: Discipline) {
    if (!discipline.id) return;
    
    const newStatus = !(discipline.isActive ?? true);
    this.disciplineService.updateDiscipline(discipline.id, { isActive: newStatus }).subscribe({
      next: () => {
        discipline.isActive = newStatus;
        this.applyFilter();
        // Atualizar cache para sincronizar com outras telas
        this.disciplineCacheService.refreshDisciplines();
      },
      error: (error) => {
        console.error('Erro ao alterar status:', error);
        alert('Erro ao alterar status da disciplina');
      }
    });
  }

  deleteDiscipline(discipline: Discipline) {
    if (!discipline.id) return;
    
    if (!confirm(`Tem certeza que deseja excluir a disciplina "${discipline.name}"?`)) {
      return;
    }

    this.disciplineService.deleteDiscipline(discipline.id).subscribe({
      next: () => {
        alert('Disciplina excluída com sucesso!');
        this.loadDisciplines();
        // Atualizar cache para sincronizar com outras telas
        this.disciplineCacheService.refreshDisciplines();
      },
      error: (error) => {
        console.error('Erro ao excluir disciplina:', error);
        const errorMsg = error.error?.error || 'Erro ao excluir disciplina';
        alert(errorMsg);
      }
    });
  }
}

