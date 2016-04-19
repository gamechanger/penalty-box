FROM node:4
MAINTAINER Alex Etling<alex@gc.io>

RUN mkdir -p /gc/penalty-box
ADD . /gc/penalty-box
WORKDIR /gc/penalty-box

RUN npm install

EXPOSE 80

CMD ["/gc/penalty-box/docker-init"]
