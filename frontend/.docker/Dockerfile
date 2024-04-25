FROM node:14.21.0-slim as build
WORKDIR /app
COPY . ./

FROM macbre/nginx-brotli
WORKDIR /etc/nginx
ADD nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
