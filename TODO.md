# TODO - Melhorias EaDuck

## 1. Adicionar ícones à sidebar
- [x] Adicionar ícone para chat (ex: chat_bubble)
- [x] Adicionar ícone para configurações (ex: settings)
- [x] Atualizar sidebar.component.html com novos links
- [ ] Atualizar sidebar.component.ts se necessário

## 2. Implementar bate-papo responsivo
- [x] Criar componente ChatComponent
- [x] Criar serviço ChatService para backend
- [x] Adicionar endpoint /api/chat no backend
- [ ] Criar tabela messages no banco (se necessário)
- [x] Implementar WebSocket para tempo real
- [x] Tornar responsivo para mobile/desktop

## 3. Melhorar sistema de login com Google Auth
- [x] Adicionar dependências OAuth2 no backend (Spring Security OAuth2)
- [x] Configurar Google OAuth2 no application.properties
- [ ] Criar endpoint /api/auth/google-login
- [x] Atualizar frontend login.component.html com botão "Login com Google"
- [x] Implementar fluxo OAuth2 no frontend
- [ ] Atualizar AuthService para suportar Google login

## 4. Testes e validação
- [ ] Testar chat responsivo em diferentes dispositivos
- [ ] Testar login com Google
- [ ] Verificar compatibilidade com navegadores
- [ ] Testar acessibilidade

## 5. Documentação
- [x] Atualizar README.md com novas funcionalidades
- [ ] Documentar APIs de chat
- [x] Documentar configuração OAuth2
