From node:16.11.1
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
EXPOSE 4000
CMD [ "npm", "start" ]
