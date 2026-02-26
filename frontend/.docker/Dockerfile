FROM node:20-alpine as build
WORKDIR /app
# Copy package files only first for better layer caching
COPY package*.json ./
RUN npm ci --frozen-lockfile --ignore-scripts
# Copy source and build
COPY . ./
RUN npm run build

# Use lightweight nginx-alpine base
FROM nginx:1.25-alpine
WORKDIR /etc/nginx
COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
