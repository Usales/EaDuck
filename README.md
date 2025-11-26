# EaDuck: Plataforma de Gestão e Comunicação Escolar 🦆📚

Bem-vindo ao **EaDuck**, uma solução digital inovadora para revolucionar a gestão escolar! Desenvolvida como projeto de conclusão do curso de Engenharia de Software na **FATESG SENAI**, a EaDuck conecta alunos, professores e gestores em um ambiente integrado, promovendo comunicação eficiente, acompanhamento acadêmico e acesso fácil a recursos educacionais. 🚀

## Sobre o Projeto 🌟

O EaDuck nasceu para resolver desafios reais na educação, como a comunicação ineficiente e a complexidade na gestão de desempenho e materiais didáticos. Nosso objetivo? Criar uma plataforma acessível, segura e intuitiva que fortaleça a comunidade escolar e melhore a qualidade do ensino, focando na relação entre alunos e professores. 📊

### Objetivos 🎯

| **Objetivo** | **Descrição** |
|--------------|---------------|
| Comunicação 📩 | Facilitar o fluxo de informações entre alunos, professores e gestores. |
| Desempenho 📈 | Simplificar o registro e acompanhamento do progresso acadêmico. |
| Recursos 📚 | Centralizar materiais didáticos em um único ambiente digital. |
| Gestão 🗂️ | Otimizar processos administrativos, como tarefas e eventos. |
| Engajamento 🤝 | Incentivar a participação ativa da comunidade escolar. |

## Diferenciais e Benefícios 🚀

- **Interface moderna e responsiva**: experiência fluida em qualquer dispositivo.
- **Notificações em tempo real**: mantenha todos informados sobre novidades, prazos e eventos.
- **Gestão centralizada**: controle total de usuários, turmas, tarefas e materiais.
- **Segurança**: autenticação JWT, criptografia de senhas e conformidade com LGPD.
- **Acesso facilitado a documentos**: upload e download de arquivos didáticos e tarefas.
- **Relatórios e dashboards**: visão clara do desempenho acadêmico e engajamento.
- **Bate-papo integrado**: comunicação instantânea entre usuários da plataforma.
- **Busca inteligente**: autocomplete em tempo real para localizar alunos e professores rapidamente.
- **Exportação de dados**: geração de PDFs completos com informações de salas, alunos e professores.
- **Boletim de notas**: PDF individual com notas por disciplina, médias e resultado final (Aprovado/Reprovado/Em andamento).
- **Perfis personalizados**: coleta e edição de dados específicos por perfil (ADMIN, TEACHER, STUDENT).

## Funcionalidades Principais ✨

A EaDuck oferece um conjunto robusto de recursos para atender às necessidades escolares:

| **Funcionalidade** | **Descrição** | **Prioridade** |
|--------------------|---------------|----------------|
| Cadastro de Usuários | Gerenciamento de contas para alunos, professores e admins. | Alta |
| Comunicação Interna | Envio de mensagens, notificações e fóruns. | Alta |
| Bate-papo Responsivo | Chat integrado para comunicação em tempo real entre usuários. | Alta |
| Registro de Notas | Professores registram notas, frequência e observações. | Alta |
| Materiais Didáticos | Publicação e acesso a arquivos, links e vídeos. | Alta |
| Setup Inicial de Perfil | Coleta de dados pessoais obrigatórios no primeiro acesso (nome, CPF, endereço, etc.). | Alta |
| Configurações de Perfil | Edição de dados pessoais na tela de configurações. | Alta |
| Busca Inteligente | Campo de busca com autocomplete para alunos e professores nas salas. | Alta |
| Exportação de Dados | Geração de PDFs com dados completos das salas (alunos, professores, administradores). | Alta |
| Boletim de Notas | Geração de PDF individual com notas por disciplina, médias e resultado final. | Alta |
| Relatórios | Geração de relatórios acadêmicos e financeiros. | Média |
| Segurança de Dados | Criptografia de senhas e conformidade com LGPD. | Alta |

## Fluxo de Uso 🧭

1. **Login**: Usuários acessam a plataforma conforme seu perfil (aluno, professor, admin).
2. **Setup de Perfil**: Usuários preenchem dados obrigatórios no primeiro acesso (nome, CPF, endereço, etc.).
3. **Gestão de Usuários**: Admins cadastram e gerenciam contas.
4. **Criação de Salas e Tarefas**: Professores e admins criam turmas e atividades.
5. **Atribuição de Alunos/Professores**: Busca inteligente com autocomplete para adicionar usuários às salas.
6. **Submissão de Tarefas**: Alunos enviam arquivos e comentários para avaliação.
7. **Avaliação**: Professores corrigem e atribuem notas e feedbacks.
8. **Notificações**: Todos recebem alertas sobre eventos, prazos e mensagens.
9. **Acesso a Materiais**: Alunos e professores compartilham e baixam documentos.
10. **Exportação de Relatórios**: Geração de PDFs com dados das salas e boletins de notas individuais.
11. **Configurações**: Edição de dados pessoais na tela de configurações.

## Tecnologias Utilizadas 🛠️

Construímos a EaDuck com ferramentas modernas para garantir desempenho, escalabilidade e usabilidade:

### Front-end 💻

| **Tecnologia** | **Versão** | **Finalidade** |
|----------------|------------|----------------|
| Angular | 18.2.0 | Framework para construção da interface |
| TypeScript | 5.5.2 | Linguagem de programação tipada |
| TailwindCSS | 3.4.17 | Framework CSS utilitário para estilização |
| SCSS | - | Pré-processador CSS |
| Bootstrap | 5.3.6 | Framework CSS complementar |
| RxJS | 7.8.1 | Programação reativa e gerenciamento de estado |
| ApexCharts | 4.7.0 | Biblioteca para criação de gráficos e dashboards |
| STOMP.js / SockJS | 7.0.0 / 1.6.1 | Comunicação WebSocket para chat em tempo real |
| PostCSS | 8.5.5 | Processamento de CSS |
| Autoprefixer | 10.4.21 | Adição automática de prefixos CSS |

### Back-end ⚙️

| **Tecnologia** | **Versão** | **Finalidade** |
|----------------|------------|----------------|
| Java | 17 | Linguagem de programação |
| Spring Boot | 3.4.0 | Framework para desenvolvimento de APIs REST |
| Spring Data JPA | - | Abstração para acesso a dados |
| Spring Security | - | Autenticação e autorização |
| Spring WebSocket | - | Comunicação em tempo real |
| Spring Mail | - | Envio de e-mails |
| JWT (jjwt) | 0.11.5 | Autenticação baseada em tokens |
| ModelMapper | 3.1.1 | Mapeamento de objetos |
| Flyway | - | Versionamento e migração de banco de dados |
| Lombok | - | Redução de boilerplate |
| Redis | - | Cache e armazenamento em memória |
| SpringDoc OpenAPI | 1.6.4 | Documentação automática da API (Swagger) |
| iTextPDF | 8.0.5 | Geração de documentos PDF (relatórios e boletins) |
| Maven | - | Gerenciamento de dependências e build |

### Banco de Dados 🗄️

| **Tecnologia** | **Finalidade** |
|----------------|----------------|
| PostgreSQL | Banco de dados relacional principal (produção) |
| H2 | Banco de dados em memória (desenvolvimento/testes) |

### DevOps & Deploy 🚀

| **Tecnologia** | **Finalidade** |
|----------------|----------------|
| Docker | Containerização da aplicação |
| Nginx | Servidor web e proxy reverso |
| Netlify | Deploy do front-end |
| Maven Wrapper | Build independente de ambiente |

### Design & Prototipagem 🎨

| **Tecnologia** | **Finalidade** |
|----------------|----------------|
| Figma | Prototipagem de interfaces intuitivas |

## Equipe 💪

Desenvolvido com paixão por:

- **Gabriel Henriques Sales**  
- **Pedro Augusto dos Santos Andrade**  
- **Aleardo Cartocci Branquinho Senna**
- **Lucas Ribeiro**
- **Orientadora**: Thielle Cathia de Paula dos Santos  

Agradecemos aos professores da FATESG e a todos que apoiaram essa jornada! 🙌

## Como Começar 🏁

Quer explorar a EaDuck? Siga os passos abaixo para configurar o projeto localmente:

1. **Pré-requisitos**:
   - Node.js (para Angular)
   - Java JDK 17+ (para back-end)
   - PostgreSQL 15+
   - Figma (para visualizar protótipos)

2. **Instalação**:
   ```bash
   # Clone o repositório (se disponível)
   git clone https://github.com/eaduck/eaduck.git

   # Instale dependências do front-end
   cd frontend
   npm install

   # Configure o back-end
   cd ../backend
   mvnw.cmd install # ou mvn install

   # Configure o banco de dados
   psql -U postgres -f schema.sql
   ```

3. **Rodando a Aplicação**:
   ```bash
   # Inicie o front-end
   cd frontend
   ng serve

   # Inicie o back-end
   cd ../backend
   mvnw.cmd spring-boot:run # ou mvn spring-boot:run
   ```

4. **Acesse**:
   - Front-end: `http://localhost:4200`
   - Documentação da API: `http://localhost:8080/swagger-ui`

## Riscos e Mitigações ⚠️

Identificamos possíveis desafios e planejamos soluções:

| **Risco** | **Impacto** | **Mitigação** |
|-----------|-------------|---------------|
| Não conformidade com LGPD | Médio | Auditorias legais regulares |
| Falha no backup de dados | Extremo | Backups automatizados diários |
| Interface confusa | Médio | Testes de usabilidade com usuários |

## Planos de Teste 🧪

Abaixo estão os principais planos e casos de teste para validação das funcionalidades do EaDuck:

### 1. Login

##### Condicionais
* Realizar o login como administrador, professor ou aluno

##### Casos de teste
* DADO que eu preciso realizar o login
* E insiro o login do usuário
* E insiro a senha do usuário
* Quando clico em logar
* Então o sistema realiza o login e redireciona para a tela inicial

##### Ambiente de homologação:
WEB: /login

---

### 2. Cadastro de Usuário (Admin)

##### Condicionais
* Estar logado como administrador

##### Casos de teste
* DADO que estou logado como administrador
* E acesso a tela de cadastro de usuário
* E preencho os campos obrigatórios (nome, e-mail, senha, papel)
* Quando clico em cadastrar
* Então o sistema cria o usuário e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /users

---

### 3. Listagem de Usuários (Admin)

##### Condicionais
* Estar logado como administrador

##### Casos de teste
* DADO que estou logado como administrador
* E acesso a tela de usuários
* Quando a tela é carregada
* Então o sistema exibe a lista de todos os usuários cadastrados

##### Ambiente de homologação:
WEB: /users

---

### 4. Cadastro de Sala de Aula (Admin/Professor)

##### Condicionais
* Estar logado como administrador ou professor

##### Casos de teste
* DADO que estou logado como administrador ou professor
* E acesso a tela de salas de aula
* E clico em "Criar sala"
* E preencho os campos obrigatórios (nome, ano letivo, professores, alunos)
* Quando clico em salvar
* Então o sistema cria a sala de aula e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /classrooms

---

### 5. Listagem de Salas de Aula

##### Condicionais
* Estar logado no sistema

##### Casos de teste
* DADO que estou logado
* E acesso a tela de salas de aula
* Quando a tela é carregada
* Então o sistema exibe a lista de salas de aula disponíveis

##### Ambiente de homologação:
WEB: /classrooms

---

### 6. Cadastro de Tarefa (Admin/Professor)

##### Condicionais
* Estar logado como administrador ou professor
* Ter pelo menos uma sala de aula cadastrada

##### Casos de teste
* DADO que estou logado como administrador ou professor
* E acesso a tela de tarefas
* E clico em "Criar tarefa"
* E preencho os campos obrigatórios (título, descrição, data de entrega, sala, tipo)
* Quando clico em salvar
* Então o sistema cria a tarefa e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /tasks

---

### 7. Listagem de Tarefas

##### Condicionais
* Estar logado no sistema

##### Casos de teste
* DADO que estou logado
* E acesso a tela de tarefas
* Quando a tela é carregada
* Então o sistema exibe a lista de tarefas disponíveis

##### Ambiente de homologação:
WEB: /tasks

---

### 8. Submissão de Tarefa (Aluno)

##### Condicionais
* Estar logado como aluno
* Ter pelo menos uma tarefa disponível

##### Casos de teste
* DADO que estou logado como aluno
* E acesso a tela de tarefas
* E clico em "Enviar tarefa" em uma tarefa disponível
* E preencho o campo de comentário (opcional)
* E seleciono um arquivo permitido
* Quando clico em enviar
* Então o sistema realiza o upload e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /tasks

---

### 9. Avaliação de Submissão (Professor/Admin)

##### Condicionais
* Estar logado como professor ou administrador
* Ter pelo menos uma submissão de tarefa para avaliar

##### Casos de teste
* DADO que estou logado como professor ou administrador
* E acesso a tela de tarefas
* E clico em "Ver alunos" em uma tarefa
* E clico em "Avaliar" em uma submissão
* E preencho a nota e o feedback
* Quando clico em salvar avaliação
* Então o sistema salva a avaliação e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /tasks

---

### 10. Notificações

##### Condicionais
* Estar logado no sistema

##### Casos de teste
* DADO que estou logado
* E acesso o sino de notificações ou a tela de notificações
* Quando há notificações não lidas
* Então o sistema exibe o badge de notificações
* E ao clicar em uma notificação, ela é marcada como lida

##### Ambiente de homologação:
WEB: /notifications

---

### 11. Setup Inicial de Perfil

##### Condicionais
* Estar logado no sistema
* Não ter preenchido os dados obrigatórios do perfil

##### Casos de teste
* DADO que estou logado pela primeira vez
* E o sistema identifica que faltam dados obrigatórios
* Quando o modal de setup aparece
* E preencho os campos obrigatórios conforme meu perfil:
  * ADMIN: Nome Completo, CPF, Endereço
  * TEACHER: Nome Completo, CPF, Endereço, Titulação
  * STUDENT: Apelido, Nome Completo, CPF, Data de Nascimento, Nome da Mãe, Nome do Pai, Telefone, Endereço
* E clico em salvar
* Então o sistema salva os dados e não exibe mais o modal

##### Ambiente de homologação:
WEB: /login ou /register (redirecionamento automático)

---

### 12. Edição de Perfil (Configurações)

##### Condicionais
* Estar logado no sistema
* Ter preenchido os dados iniciais do perfil

##### Casos de teste
* DADO que estou logado
* E acesso a tela de configurações
* E visualizo meus dados pessoais editáveis
* Quando modifico algum campo
* E clico em "Salvar Dados"
* Então o sistema atualiza os dados e exibe mensagem de sucesso

##### Ambiente de homologação:
WEB: /settings

---

### 13. Busca de Alunos e Professores (Salas)

##### Condicionais
* Estar logado como administrador ou professor
* Ter acesso a uma sala de aula

##### Casos de teste
* DADO que estou logado como administrador ou professor
* E acesso a tela de salas
* E clico em "Alunos" ou "Professores" em uma sala
* Quando começo a digitar no campo de busca
* Então o sistema exibe sugestões em tempo real com nome completo e email
* E ao clicar em uma sugestão, o usuário é adicionado à sala

##### Ambiente de homologação:
WEB: /classrooms

---

### 14. Exportação de Dados da Sala (Dados PDF)

##### Condicionais
* Estar logado como administrador ou professor
* Ter acesso a uma sala de aula

##### Casos de teste
* DADO que estou logado como administrador ou professor
* E acesso a tela de salas
* E clico em "Dados PDF" em uma sala
* Quando o PDF é gerado
* Então o sistema faz o download de um PDF contendo:
  * Informações gerais da sala (Nome, Ano Letivo)
  * Dados completos de todos os alunos (ID, Email, Nome Completo, CPF, Data de Nascimento, Nome da Mãe, Nome do Pai, Telefone, Endereço, Status, Matrícula, Curso, Ano Letivo, Resultado Final)
  * Dados completos de todos os professores (ID, Email, Nome Completo, CPF, Endereço, Titulação, Tipo, Status)
  * Dados completos de todos os administradores (ID, Email, Nome Completo, CPF, Endereço, Titulação, Tipo, Status)

##### Ambiente de homologação:
WEB: /classrooms

---

### 15. Exportação de Boletim de Notas (Notas PDF)

##### Condicionais
* Estar logado como administrador ou professor
* Ter acesso a uma sala de aula
* Ter alunos com notas registradas na sala

##### Casos de teste
* DADO que estou logado como administrador ou professor
* E acesso a tela de salas
* E clico em "Notas PDF" em uma sala
* Quando o modal de seleção de aluno aparece
* E seleciono um aluno
* Então o sistema gera e faz o download de um PDF contendo:
  * Cabeçalho com nome da instituição
  * Título: "Boletim de Notas – [Nome do Aluno]"
  * Informações do aluno (Nome Completo, Matrícula, CPF, Curso, Ano Letivo)
  * Tabela com notas por disciplina (Disciplina, Nota 1, Nota 2, Nota 3, Média Final)
  * Resultado Final (Em andamento/Aprovado/Reprovado)
  * Rodapé com data de geração

##### Ambiente de homologação:
WEB: /classrooms

---

## Conclusão 🌈

A EaDuck é mais que uma plataforma — é um passo rumo à modernização da educação! Com foco em usabilidade, segurança e inovação, nosso projeto reflete o compromisso com a qualidade e as melhores práticas de engenharia de software. Estamos animados para ver como a EaDuck pode transformar escolas e engajar comunidades educacionais. 💡

---

**EaDuck Team** | FATESG SENAI | 2025 🦆
