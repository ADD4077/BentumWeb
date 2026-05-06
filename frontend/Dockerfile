FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "start"]
