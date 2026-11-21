FROM node:24

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

WORKDIR /app
COPY . .
RUN RUN npm ci --omit=dev
ENV FORCE_COLOR=1
CMD ["node", "index.js"]
