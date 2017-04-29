FROM node:alpine

COPY package.json /

RUN npm install --production

COPY action.js /

CMD echo "${CRON_MINUTE:-$(shuf -i 0-59 -n1)} ${CRON_HOUR:-*} * * * node /action.js" > /var/spool/cron/crontabs/root && crond -d 8 -f
