FROM node:alpine

COPY package.json /

RUN npm install

COPY action.js /

CMD node action.js
