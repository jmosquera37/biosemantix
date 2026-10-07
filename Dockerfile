# Etapa 1: construir la aplicación
FROM node:24-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código del proyecto
COPY . .

# Construir la aplicación para producción
RUN npm run build


# Etapa 2: servir la aplicación con Nginx
FROM nginx:alpine

# Copiar la aplicación construida
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto HTTP
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]