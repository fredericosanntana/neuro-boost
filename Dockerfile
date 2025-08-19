## Dockerfile para build e execução em produção
FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependências e instala
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install

# Copia o restante do código-fonte
COPY . .

# Build do front-end e do servidor
RUN npm run build && npm run build:server

ENV NODE_ENV=production

# Expõe a porta da API
EXPOSE 3001

# Comando para iniciar o servidor compilado
CMD ["npm", "run", "start:server"]
