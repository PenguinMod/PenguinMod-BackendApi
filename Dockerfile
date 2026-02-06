FROM node:20
WORKDIR /app
COPY . .
RUN npm i
ENV FORCE_COLOR=1
CMD node index.js
