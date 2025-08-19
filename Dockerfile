# Dockerfile para projeto Node.js/TypeScript (Vite)
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package.json package-lock.json* bun.lockb* ./

# Instala as dependências
RUN npm install || bun install

# Copia o restante do código
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Comando padrão para desenvolvimento
CMD ["npm", "run", "dev"]
