FROM node:alpine

COPY package.json .npmrc /

RUN npm install --production

COPY action.js /

CMD node action.js
