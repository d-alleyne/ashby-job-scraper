FROM apify/actor-node:22

COPY package*.json ./

RUN npm install --include=optional --omit=dev \
 && rm -rf /root/.npm

COPY . ./

CMD npm start
