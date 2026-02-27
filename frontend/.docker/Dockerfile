FROM macbre/nginx-brotli:1.19.6-http3
WORKDIR /etc/nginx
COPY nginx.conf /etc/nginx/nginx.conf

COPY build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
