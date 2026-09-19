FROM node:20-slim
WORKDIR /programas/api-orders
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "main.js"]
