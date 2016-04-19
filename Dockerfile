FROM node:4
MAINTAINER Alex Etling<alex@gc.io>

ADD . /usr/src/penalty-box
WORKDIR /usr/src/penalty-box

RUN npm install

EXPOSE 80

CMD ["/usr/src/docker-init"]
