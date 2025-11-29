# Diagramas do Sistema EaDuck

Este documento lista todos os diagramas criados para o sistema EaDuck, organizados por categoria.

## Diagramas Criados

### Diagramas Estruturais (UML)

1. **eaduck-uml-class-diagram.drawio** ✅
   - Diagrama de Classes UML completo
   - Inclui entidades do backend (Java) e interfaces do frontend (TypeScript)
   - Relacionamentos entre classes

2. **eaduck-object-diagram.drawio** ✅
   - Diagrama de Objetos
   - Mostra instâncias específicas de objetos do sistema
   - Exemplo: instância de tarefa com seus relacionamentos

3. **eaduck-component-diagram.drawio** ✅
   - Diagrama de Componentes
   - Arquitetura de componentes do sistema
   - Frontend (Angular) e Backend (Spring Boot)

4. **eaduck-package-diagram.drawio** ✅
   - Diagrama de Pacotes
   - Organização de pacotes Java e módulos TypeScript
   - Dependências entre pacotes

5. **eaduck-composite-structure-diagram.drawio** ✅
   - Diagrama de Estrutura Composta
   - Estrutura interna de componentes complexos
   - Exemplo: sistema de gerenciamento de tarefas

6. **eaduck-deployment-diagram.drawio** ✅
   - Diagrama de Implantação
   - Arquitetura de implantação do sistema
   - Servidores, banco de dados, cache, storage

7. **eaduck-entity-relationship-diagram.drawio** ✅
   - Diagrama ER (Entidade-Relacionamento)
   - Modelo de dados do banco de dados
   - Tabelas, relacionamentos e cardinalidades

### Diagramas Comportamentais (UML)

8. **eaduck-use-case-diagram.drawio** ✅
   - Diagrama de Casos de Uso
   - Atores: Estudante, Professor, Administrador
   - Casos de uso principais do sistema

9. **eaduck-sequence-diagram-submit-task.drawio** ✅
   - Diagrama de Sequência
   - Fluxo de submissão de tarefa
   - Interação entre componentes

10. **eaduck-communication-diagram.drawio** ✅
    - Diagrama de Comunicação
    - Comunicação entre objetos na criação de tarefa
    - Alternativa ao diagrama de sequência

11. **eaduck-activity-diagram-task-flow.drawio** ✅
    - Diagrama de Atividade
    - Fluxo de processo de tarefas
    - Atividades paralelas e decisões

12. **eaduck-state-diagram-submission.drawio** ✅
    - Diagrama de Estados
    - Estados de uma submissão de tarefa
    - Transições entre estados

### Diagramas BPMN

13. **eaduck-bpmn-process-diagram.drawio** ✅
    - Business Process Diagram
    - Processo de negócio de avaliação de tarefa
    - Eventos, tarefas e gateways

14. **eaduck-bpmn-collaboration-diagram.drawio** ✅
    - Collaboration Diagram
    - Colaboração entre participantes
    - Pools: Estudante, Sistema, Professor

### Diagramas Arquiteturais

15. **eaduck-architecture-diagram.drawio** ✅
    - Diagrama de Arquitetura
    - Arquitetura em camadas do sistema
    - Apresentação, Aplicação, Domínio, Infraestrutura

16. **eaduck-dfd-level-0.drawio** ✅
    - Diagrama de Fluxo de Dados (Nível 0)
    - Fluxo de dados do sistema
    - Entidades externas, processos e armazenamentos

## Como Visualizar

Todos os diagramas estão no formato `.drawio` e podem ser abertos em:

- [draw.io](https://app.diagrams.net/) (online)
- [draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases)
- VS Code com extensão "Draw.io Integration"

## Organização

Os diagramas estão organizados por:
- **Tipo**: Estrutural, Comportamental, BPMN, Arquitetural
- **Escopo**: Sistema completo, módulo específico, processo
- **Nível**: Alto nível, detalhado, implementação

## Notas

- Os diagramas foram criados com base no código-fonte atual do sistema
- Alguns diagramas podem precisar de atualização conforme o sistema evolui
- Diagramas de Perfis, Interação Geral e Temporização podem ser adicionados conforme necessidade

## Manutenção

Quando houver alterações significativas no sistema:
1. Atualize os diagramas relevantes
2. Mantenha a consistência entre diagramas
3. Documente mudanças importantes

---

**Última atualização**: Janeiro 2024  
**Total de diagramas**: 16

