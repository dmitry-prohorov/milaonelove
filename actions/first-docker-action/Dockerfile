FROM node:slim

# # install
# COPY package*.json ./
# RUN npm ci --only=production

# start
COPY . .
ENTRYPOINT ["dist/index.js"]