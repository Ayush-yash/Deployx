FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git docker-cli docker-cli-buildx
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
