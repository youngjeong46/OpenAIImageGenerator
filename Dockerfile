ARG ARCH=
FROM ${ARCH}node:18-alpine
ENV OPENAI_API_KEY ""
WORKDIR /usr/src/app
COPY . /usr/src/app/
RUN npm install

EXPOSE 3000
CMD "npm" "start"