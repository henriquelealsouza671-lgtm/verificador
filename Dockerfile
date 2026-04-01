# Usa uma imagem com Node.js
FROM node:18

# Instala o Python e o Pip dentro do servidor
RUN apt-get update && apt-get install -y python3 python3-pip

# Cria a pasta do app
WORKDIR /app

# Copia os arquivos do Node e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código (incluindo o verificador.py)
COPY . .

# Instala as bibliotecas do Python
RUN pip3 install requests --break-system-packages

# Abre a porta do servidor
EXPOSE 3001

# Comando para ligar o servidor
CMD ["node", "server.js"]