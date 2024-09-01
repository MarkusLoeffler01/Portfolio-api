FROM node:21-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm i -g typescript

COPY . .
RUN tsc

CMD ["npm", "run", "start:prod"]