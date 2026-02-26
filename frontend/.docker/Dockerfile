FROM node:20-alpine as build

# accept API URL (and any other REACT_APP_* values) via build-args
ARG REACT_APP_API_URL
ARG REACT_APP_NGROK_URL
# export them so `npm run build` can see them
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_NGROK_URL=$REACT_APP_NGROK_URL

WORKDIR /app
# Copy package files only first for better layer caching
COPY package*.json ./
RUN npm ci --ignore-scripts
# Copy source and build
COPY . ./
RUN npm run build

# Use lightweight nginx-alpine base
FROM macbre/nginx-brotli:1.19.6-http3
WORKDIR /etc/nginx
COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
