# Use a imagem oficial do Node.js
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos package.json e package-lock.json
COPY package*.json ./

# Instala as dependências
RUN npm ci --only=production

# Copia o código fonte
COPY . .

# Compila a aplicação Angular para produção
RUN npm run build

# Use nginx para servir a aplicação
FROM nginx:alpine

# Copia os arquivos compilados para o nginx
COPY --from=0 /app/dist/frontend /usr/share/nginx/html

# Copia a configuração personalizada do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expõe a porta 4200
EXPOSE 4200

# Inicia o nginx
CMD ["nginx", "-g", "daemon off;"]
