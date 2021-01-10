FROM node:14-alpine

WORKDIR /usr/src

COPY package*.json ./

COPY . .

RUN npm ci --production && npm cache clean --force

CMD [ "node", "index.js" ]
