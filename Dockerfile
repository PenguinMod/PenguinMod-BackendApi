# syntax=docker/dockerfile:1

FROM node:24

WORKDIR /app

ARG GIT_COMMIT=unknown

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY . .

ENV GIT_COMMIT=$GIT_COMMIT
ENV FORCE_COLOR=1
CMD ["node", "index.js"]
