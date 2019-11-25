FROM node:slim

# # install
# COPY package*.json ./
# RUN npm ci --only=production

# start
COPY ./dist/index.js /index.js
ENTRYPOINT ["index.js"]