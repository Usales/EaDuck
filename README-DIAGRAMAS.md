# Diagramas de Classe e Entidade-Relacionamento - EaDuck

Este documento descreve os diagramas de classe UML e de Entidade-Relacionamento (ER) do sistema EaDuck, uma plataforma de ensino a distância.

## Arquivos dos Diagramas

- **`diagrama-classe.drawio`** - Diagrama UML de classes representando as entidades do backend (Java) e interfaces do frontend (TypeScript)
- **`diagrama-er.drawio`** - Diagrama de Entidade-Relacionamento representando o modelo de dados do banco de dados

## Como Visualizar os Diagramas

Os arquivos `.drawio` podem ser abertos em:
- [draw.io](https://app.diagrams.net/) (online)
- [draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases) (aplicativo)
- VS Code com extensão "Draw.io Integration"

## Diagrama de Classe UML

### Visão Geral

O diagrama de classe mostra a estrutura das classes Java do backend e interfaces TypeScript do frontend, incluindo seus atributos, métodos e relacionamentos.

### Entidades Principais

#### Backend (Classes Java)

1. **User** (Usuários)
   - Representa usuários do sistema (estudantes, professores, administradores)
   - Atributos principais: id, email, password, name, role, dados pessoais
   - Relacionamentos: Many-to-Many com Classroom (como student e teacher)

2. **Classroom** (Salas de Aula)
   - Representa salas de aula virtuais
   - Atributos: id, name, academicYear, isActive, createdAt
   - Relacionamentos: Many-to-Many com User, One-to-Many com Task

3. **Task** (Tarefas/Atividades)
   - Representa tarefas e atividades criadas pelos professores
   - Atributos: id, title, description, dueDate, type, discipline
   - Relacionamentos: Many-to-One com Classroom e User (createdBy), One-to-Many com TaskAttachment e Submission

4. **TaskAttachment** (Anexos de Tarefas)
   - Representa arquivos anexados às tarefas
   - Atributos: id, fileName, fileSize, fileType, fileUrl, uploadedAt
   - Relacionamento: Many-to-One com Task

5. **Submission** (Submissões)
   - Representa submissões de tarefas pelos estudantes
   - Atributos: id, content, submittedAt, fileUrl, grade, feedback, evaluatedAt
   - Relacionamentos: Many-to-One com Task e User (student)

6. **Attendance** (Frequência/Chamada)
   - Representa registros de frequência dos estudantes
   - Atributos: id, date, status, arrivalTime, observations, discipline, period
   - Relacionamentos: Many-to-One com Classroom, User (student e teacher)
   - Usa enums: AttendanceStatus e Period

7. **Discipline** (Disciplinas)
   - Representa disciplinas do sistema
   - Atributos: id, name, description, isActive, createdAt, updatedAt

8. **Notification** (Notificações)
   - Representa notificações para usuários
   - Atributos: id, message, notificationType, title, isRead, createdAt
   - Relacionamentos: Many-to-One com User, Many-to-One (opcional) com Task

9. **Message** (Mensagens Diretas)
   - Representa mensagens diretas entre usuários
   - Atributos: id, content, sentAt
   - Relacionamentos: Many-to-One com User (sender e receiver)

10. **ChatMessageEntity** (Mensagens de Chat)
    - Representa mensagens em chats de salas de aula
    - Atributos: id, senderEmail, senderName, senderRole, content, messageType, classroomId, informações de arquivo
    - Relacionamentos: One-to-Many com MessageReaction e MessageView, auto-referência (repliedToMessage)

11. **MessageReaction** (Reações a Mensagens)
    - Representa reações (emojis) a mensagens de chat
    - Atributos: id, messageId, userEmail, emoji, createdAt
    - Relacionamento: Many-to-One com ChatMessageEntity

12. **MessageView** (Visualizações de Mensagens)
    - Representa visualizações de mensagens de chat
    - Atributos: id, messageId, userEmail, viewedAt
    - Relacionamento: Many-to-One com ChatMessageEntity

#### Frontend (Interfaces TypeScript)

As interfaces do frontend espelham as entidades do backend, adaptadas para TypeScript:
- **User** - Interface para dados de usuário
- **Classroom** - Interface para dados de sala de aula
- **Task** - Interface para dados de tarefa
- **Submission** - Interface para dados de submissão
- **ChatMessage** - Interface para mensagens de chat

### Enums

- **Role**: STUDENT, TEACHER, ADMIN
- **AttendanceStatus**: PRESENT, ABSENT, LATE
- **Period**: MANHA, TARDE, INTEGRAL
- **MessageType**: CHAT, JOIN, LEAVE, IMAGE, AUDIO

### Relacionamentos Principais

1. **User ↔ Classroom**: Many-to-Many através de tabelas de junção (classroom_students e classroom_teachers)
2. **Classroom → Task**: One-to-Many (uma sala tem várias tarefas)
3. **Task → TaskAttachment**: One-to-Many (uma tarefa tem vários anexos)
4. **Task → Submission**: One-to-Many (uma tarefa recebe várias submissões)
5. **User → Submission**: Many-to-One (um estudante faz várias submissões)
6. **Classroom → Attendance**: One-to-Many (uma sala tem vários registros de frequência)
7. **User → Attendance**: Many-to-One (um estudante tem vários registros de frequência)
8. **User → Notification**: One-to-Many (um usuário recebe várias notificações)
9. **ChatMessageEntity → MessageReaction/MessageView**: One-to-Many

## Diagrama de Entidade-Relacionamento (ER)

### Visão Geral

O diagrama ER mostra o modelo de dados do banco de dados, incluindo todas as tabelas, seus atributos, chaves primárias (PK), chaves estrangeiras (FK) e relacionamentos com cardinalidades.

### Tabelas do Banco de Dados

#### Tabelas Principais

1. **users**
   - Chave primária: `id`
   - Campos únicos: `email`
   - Campos principais: email, password, role, is_active, name, dados pessoais completos
   - Constraints: role deve ser STUDENT, TEACHER ou ADMIN

2. **classrooms**
   - Chave primária: `id`
   - Campos: name, academic_year, is_active, created_at

3. **tasks**
   - Chave primária: `id`
   - Chaves estrangeiras: `classroom_id` → classrooms, `created_by` → users
   - Campos: title, description, due_date, type, discipline

4. **submissions**
   - Chave primária: `id`
   - Chaves estrangeiras: `task_id` → tasks, `student_id` → users
   - Campos: content, submitted_at, file_url, grade, feedback, evaluated_at

5. **attendances**
   - Chave primária: `id`
   - Chaves estrangeiras: `classroom_id` → classrooms, `student_id` → users, `teacher_id` → users
   - Campos: date, status, arrival_time, observations, discipline, period
   - Constraint único: (classroom_id, student_id, date)

6. **notifications**
   - Chave primária: `id`
   - Chaves estrangeiras: `user_id` → users, `task_id` → tasks (opcional)
   - Campos: message, notification_type, title, is_read, created_at

7. **messages**
   - Chave primária: `id`
   - Chaves estrangeiras: `sender_id` → users, `receiver_id` → users
   - Campos: content, sent_at

8. **chat_messages**
   - Chave primária: `id`
   - Chave estrangeira: `replied_to_message_id` → chat_messages (auto-referência)
   - Campos: sender_email, sender_name, sender_role, content, message_type, classroom_id, informações de arquivo

9. **message_reactions**
   - Chave primária: `id`
   - Chave estrangeira: `message_id` → chat_messages
   - Constraint único: (message_id, user_email, emoji)

10. **message_views**
    - Chave primária: `id`
    - Chave estrangeira: `message_id` → chat_messages
    - Constraint único: (message_id, user_email)

11. **disciplines**
    - Chave primária: `id`
    - Campo único: `name`
    - Campos: description, is_active, created_at, updated_at

12. **task_attachments**
    - Chave primária: `id`
    - Chave estrangeira: `task_id` → tasks
    - Campos: file_name, file_size, file_type, file_url, uploaded_at

#### Tabelas de Junção (Many-to-Many)

1. **classroom_students**
   - Chave primária composta: (classroom_id, student_id)
   - Chaves estrangeiras: `classroom_id` → classrooms, `student_id` → users
   - Relaciona estudantes com salas de aula

2. **classroom_teachers**
   - Chave primária composta: (classroom_id, teacher_id)
   - Chaves estrangeiras: `classroom_id` → classrooms, `teacher_id` → users
   - Relaciona professores com salas de aula

### Cardinalidades dos Relacionamentos

#### Relacionamentos One-to-Many (1:N)

- **classrooms → tasks**: 1 sala tem N tarefas
- **tasks → task_attachments**: 1 tarefa tem N anexos
- **tasks → submissions**: 1 tarefa recebe N submissões
- **users → submissions**: 1 estudante faz N submissões
- **classrooms → attendances**: 1 sala tem N registros de frequência
- **users → attendances**: 1 estudante tem N registros de frequência
- **users → notifications**: 1 usuário recebe N notificações
- **users → messages (sender)**: 1 usuário envia N mensagens
- **users → messages (receiver)**: 1 usuário recebe N mensagens
- **chat_messages → message_reactions**: 1 mensagem tem N reações
- **chat_messages → message_views**: 1 mensagem tem N visualizações

#### Relacionamentos Many-to-Many (N:M)

- **users ↔ classrooms**: N usuários participam de N salas (através de classroom_students e classroom_teachers)

#### Relacionamentos Many-to-One (N:1)

- **tasks → users (created_by)**: N tarefas são criadas por 1 usuário
- **attendances → users (teacher)**: N registros de frequência podem ter 1 professor (opcional)

#### Relacionamentos Opcionais (0..1)

- **tasks → notifications**: 0 ou 1 notificação pode estar relacionada a uma tarefa
- **attendances → users (teacher)**: 0 ou 1 professor pode estar relacionado a um registro de frequência
- **chat_messages → chat_messages (replied_to_message)**: 0 ou 1 mensagem pode ser uma resposta a outra mensagem

### Convenções de Nomenclatura

- **Chaves Primárias (PK)**: Sempre nomeadas como `id` (tipo BIGINT)
- **Chaves Estrangeiras (FK)**: Seguem o padrão `{tabela_referenciada}_id` (ex: `classroom_id`, `student_id`)
- **Tabelas**: Nomes no plural e em minúsculas com underscore (snake_case)
- **Campos**: Nomes em minúsculas com underscore (snake_case)
- **Constraints**: 
  - `UNIQUE` para campos únicos
  - `CHECK` para validações de valores permitidos
  - `FOREIGN KEY` para relacionamentos

## Observações Importantes

1. **Segurança**: A tabela `users` armazena senhas criptografadas (BCrypt) e não devem ser expostas em APIs públicas.

2. **Soft Delete**: Algumas entidades usam campos `is_active` para soft delete ao invés de exclusão física.

3. **Auditoria**: Várias tabelas incluem campos `created_at` e `updated_at` para rastreamento de alterações.

4. **Arquivos**: Arquivos são armazenados como URLs (provavelmente em storage externo ou sistema de arquivos), não diretamente no banco.

5. **Chat em Tempo Real**: O sistema usa WebSocket para chat em tempo real, mas as mensagens são persistidas na tabela `chat_messages`.

6. **Notificações**: As notificações podem estar relacionadas a tarefas, mas essa relação é opcional, permitindo notificações gerais.

## Uso dos Diagramas

### Para Desenvolvedores

- **Diagrama de Classe**: Use para entender a estrutura do código, relacionamentos entre classes e como implementar novas funcionalidades.
- **Diagrama ER**: Use para entender a estrutura do banco de dados, criar queries SQL eficientes e planejar migrações.

### Para Analistas e Designers

- Use os diagramas para entender o domínio do sistema e planejar novas funcionalidades.
- O diagrama ER ajuda a entender as regras de negócio implícitas nos relacionamentos.

### Para Documentação

- Os diagramas servem como documentação visual do sistema.
- Podem ser incluídos em documentação técnica, apresentações e especificações.

## Manutenção dos Diagramas

Quando houver alterações no código ou banco de dados:

1. Atualize as entidades correspondentes nos diagramas
2. Adicione novos relacionamentos se necessário
3. Mantenha a consistência entre o diagrama de classe e o diagrama ER
4. Documente mudanças significativas neste README

## Ferramentas Recomendadas

- **draw.io**: Para editar os diagramas
- **PlantUML**: Alternativa para diagramas baseados em texto (se preferir)
- **pgAdmin / DBeaver**: Para visualizar o banco de dados diretamente
- **IntelliJ IDEA**: Para visualizar classes Java e seus relacionamentos

---

**Última atualização**: Janeiro 2024  
**Versão do Sistema**: 0.0.1-SNAPSHOT

