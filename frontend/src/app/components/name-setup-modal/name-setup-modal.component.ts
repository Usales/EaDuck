import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-name-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './name-setup-modal.component.html',
  styleUrls: ['./name-setup-modal.component.scss']
})
export class NameSetupModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() userRole: string = 'STUDENT'; // Para detectar se é professor ou aluno
  @Output() nameSet = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  // Campos do formulário
  nickname = '';
  nomeCompleto = '';
  cpf = '';
  dataNascimento = '';
  nomeMae = '';
  nomePai = '';
  telefone = '';
  endereco = '';
  titulacao = ''; // Para professores - múltiplas titulações separadas por ponto e vírgula
  titulacoes: string[] = []; // Array para gerenciar múltiplas titulações

  isLoading = false;
  error = '';

  get isTeacher(): boolean {
    return this.userRole === 'TEACHER';
  }

  get isStudent(): boolean {
    return this.userRole === 'STUDENT';
  }

  get isAdmin(): boolean {
    return this.userRole === 'ADMIN';
  }

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Garantir que o array está inicializado
    if (!this.titulacoes) {
      this.titulacoes = [];
    }
  }

  isDarkMode(): boolean {
    return this.themeService.getCurrentTheme() === 'dark';
  }

  formatDate(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '-' + value.substring(2);
    }
    if (value.length >= 5) {
      value = value.substring(0, 5) + '-' + value.substring(5, 9);
    }
    this.dataNascimento = value;
  }

  formatCPF(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      this.cpf = value;
    }
  }

  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
      }
      this.telefone = value;
    }
  }

  addTitulacao(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Verificar se está carregando
    if (this.isLoading) {
      return;
    }
    
    const titulacaoTrimmed = this.titulacao?.trim() || '';
    
    if (!titulacaoTrimmed) {
      this.error = 'Por favor, digite uma titulação antes de adicionar';
      setTimeout(() => { this.error = ''; }, 3000);
      return;
    }
    
    // Verificar se já existe
    if (this.titulacoes.includes(titulacaoTrimmed)) {
      this.error = 'Esta titulação já foi adicionada';
      setTimeout(() => { this.error = ''; }, 3000);
      return;
    }
    
    // Adicionar titulação
    this.titulacoes = [...this.titulacoes, titulacaoTrimmed];
    this.titulacao = '';
    this.error = '';
    
    // Forçar detecção de mudanças
    this.cdr.detectChanges();
  }

  removeTitulacao(index: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.titulacoes.splice(index, 1);
    this.error = '';
    // Forçar detecção de mudanças
    this.cdr.detectChanges();
  }

  validateForm(): boolean {
    if (!this.nomeCompleto.trim()) {
      this.error = 'Por favor, digite seu nome completo';
      return false;
    }
    if (!this.cpf.trim()) {
      this.error = 'Por favor, digite seu CPF';
      return false;
    }
    if (!this.endereco.trim()) {
      this.error = 'Por favor, digite seu endereço';
      return false;
    }

    // Para ADMIN, apenas nomeCompleto, CPF e endereço são necessários
    if (this.isAdmin) {
      return true;
    }

    // Validações específicas para alunos
    if (this.isStudent) {
      if (!this.nickname.trim()) {
        this.error = 'Por favor, digite seu apelido/nickname';
        return false;
      }
      if (!this.dataNascimento.trim() || this.dataNascimento.length !== 10) {
        this.error = 'Por favor, digite sua data de nascimento no formato dd-mm-aaaa';
        return false;
      }
      if (!this.nomeMae.trim()) {
        this.error = 'Por favor, digite o nome da sua mãe';
        return false;
      }
      if (!this.nomePai.trim()) {
        this.error = 'Por favor, digite o nome do seu pai';
        return false;
      }
      if (!this.telefone.trim()) {
        this.error = 'Por favor, digite seu telefone de contato';
        return false;
      }
    }

    // Validações específicas para professores
    if (this.isTeacher) {
      if (this.titulacoes.length === 0) {
        this.error = 'Por favor, adicione pelo menos uma titulação';
        return false;
      }
    }

    return true;
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.error = '';

    const userData: any = {
      nomeCompleto: this.nomeCompleto.trim(),
      cpf: this.cpf.trim(),
      endereco: this.endereco.trim()
    };

    // Campos específicos para alunos
    if (this.isStudent) {
      userData.name = this.nickname.trim();
      userData.dataNascimento = this.dataNascimento.trim();
      userData.nomeMae = this.nomeMae.trim();
      userData.nomePai = this.nomePai.trim();
      userData.telefone = this.telefone.trim();
    }

    // Campos específicos para professores
    if (this.isTeacher) {
      userData.titulacao = this.titulacoes.join('; ');
    }

    this.authService.updateUserData(userData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        // Se for ADMIN e preencheu os dados, salvar em cache
        if (this.isAdmin && this.nomeCompleto.trim() && this.cpf.trim() && this.endereco.trim()) {
          localStorage.setItem('adminDataFilled', 'true');
        }
        
        // Se for TEACHER e preencheu os dados, salvar em cache
        if (this.isTeacher && this.nomeCompleto.trim() && this.cpf.trim() && this.endereco.trim() && this.titulacoes.length > 0) {
          localStorage.setItem('teacherDataFilled', 'true');
        }
        
        // Se for STUDENT e preencheu os dados, salvar em cache
        if (this.isStudent && this.nickname.trim() && this.nomeCompleto.trim() && this.cpf.trim() && 
            this.dataNascimento.trim() && this.nomeMae.trim() && this.nomePai.trim() && 
            this.telefone.trim() && this.endereco.trim()) {
          localStorage.setItem('studentDataFilled', 'true');
        }
        
        this.nameSet.emit(response.name || this.nickname);
        this.resetForm();
        this.error = '';
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error?.error || 'Erro ao salvar dados';
        console.error('Erro ao atualizar dados:', error);
      }
    });
  }

  resetForm() {
    this.nickname = '';
    this.nomeCompleto = '';
    this.cpf = '';
    this.dataNascimento = '';
    this.nomeMae = '';
    this.nomePai = '';
    this.telefone = '';
    this.endereco = '';
    this.titulacao = '';
    this.titulacoes = [];
  }

  onClose() {
    this.close.emit();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }
}
