FROM node:alpine

COPY package.json /

RUN npm install --production

COPY action.js /

CMD echo "$S3_OBJ_PRUNE_CRON_MINUTE $S3_OBJ_PRUNE_CRON_HOUR * * * node /action.js" > /var/spool/cron/crontabs/root && crond -d 8 -f
