# 第一阶段：构建
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY . .
RUN npm run build

# 第二阶段：运行（Nginx 服务静态文件）
FROM nginx:alpine
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
