# Dockerfile (best practice minimalista per Next.js)
FROM node:lts-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
