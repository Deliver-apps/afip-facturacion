# Etapa 1: Construcción
FROM node:20-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY package.json package-lock.json* ./

# Instala todas las dependencias (incluyendo devDependencies)
RUN npm install

# Copia el resto del código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Etapa 2: Producción
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia únicamente package.json para instalar las dependencias de producción
COPY package.json ./

# Instala solo las dependencias de producción
RUN npm install --production

# Copia los archivos compilados desde la etapa de construcción
COPY --from=builder /app/dist ./dist

# Establece la variable de entorno para producción
ENV NODE_ENV=production

# Expone el puerto en el que la aplicación escuchará (ajusta si es necesario)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
