FROM node:20

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

WORKDIR /app
COPY . .
RUN npm i
CMD FORCE_COLOR=1 node index.js
