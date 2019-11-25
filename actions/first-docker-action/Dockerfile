FROM node:slim

# install
COPY package*.json ./
RUN npm ci --only=production

# start
COPY ./index.js /index.js
ENTRYPOINT ["/index.js"]