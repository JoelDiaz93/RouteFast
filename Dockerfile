# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
WORKDIR /app
ARG APP
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx nest build ${APP}

FROM node:22-alpine AS runtime
WORKDIR /app
ARG APP
ENV NODE_ENV=production
ENV APP_NAME=${APP}
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main.js"]
