FROM node:18-alpine AS base

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "run", "start"]
