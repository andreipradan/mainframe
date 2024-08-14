FROM node:14.21.0-slim as build
WORKDIR /app
COPY . ./

FROM macbre/nginx-brotli:1.19.6-http3
WORKDIR /etc/nginx
COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
