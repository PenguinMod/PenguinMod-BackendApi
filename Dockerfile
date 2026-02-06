FROM node:20
WORKDIR /app
COPY . .
RUN npm i
CMD FORCE_COLOR=1 node index.js
