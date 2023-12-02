From node:21.3.0
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
EXPOSE 4000
CMD [ "npm", "start" ]
