# EaDuck - Frontend

## Sobre o Projeto
EaDuck é uma plataforma de ensino a distância desenvolvida com Angular, oferecendo uma interface moderna e intuitiva para estudantes e professores.

## Funcionalidades Implementadas

### Autenticação e Registro
- Sistema completo de login e registro de usuários
- Validação de formulários em tempo real
- Feedback visual para erros e sucessos
- Integração com JWT para autenticação segura

### Interface do Usuário
- Design responsivo utilizando Tailwind CSS
- Componentes reutilizáveis e modulares
- Navegação intuitiva entre páginas
- Feedback visual para ações do usuário

### Componentes Principais
- **Login**: Formulário de autenticação com validação
- **Registro**: Cadastro de novos usuários com validação de campos
- **Card**: Componente reutilizável para exibição de conteúdo
- **Layout**: Estrutura base da aplicação com header e navegação

### Tecnologias Utilizadas
- Angular 17
- Tailwind CSS para estilização
- TypeScript
- SCSS para estilos personalizados
- Angular Material para componentes UI

### Estrutura do Projeto
```
src/
├── app/
│   ├── components/
│   │   ├── card/
│   │   └── layout/
│   │   
│   ├── pages/
│   │   ├── login/
│   │   └── register/
│   │   
│   ├── services/
│   │   └── auth.service.ts
│   │   
│   └── models/
│       └── user.model.ts
│   
├── assets/
└── styles/
    └── styles.scss
```

## Como Executar

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
ng serve
```

3. Acesse a aplicação em `http://localhost:4200`

## Desenvolvimento

### Melhorias Implementadas
- Sistema de feedback visual para ações do usuário
- Validação de formulários em tempo real
- Integração com backend via serviços
- Componentes reutilizáveis para melhor manutenção

### Próximos Passos
- Implementação de dashboard do usuário
- Sistema de notificações
- Integração com sistema de cursos
- Melhorias de acessibilidade

## Contribuição
Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
