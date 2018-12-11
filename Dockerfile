FROM node:8

WORKDIR /bucket

ARG env-bucket
ARG env-dbendpoint
ARG env-port
ARG env-user
ARG env-password
ARG env-database

ENV bucket $env-bucket
ENV dbhost $env-dbendpoint
ENV port $env-port
ENV user $env-user
ENV pass $env-password
ENV dbname $env-database

COPY package*.json ./

RUN npm install && \
    npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
