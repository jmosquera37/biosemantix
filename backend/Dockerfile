# Imagen del backend FastAPI de BioSemantix para Render (Docker).
#
# Contexto de build: la carpeta `backend/`, no la raíz del repositorio.
#   docker build -t biosemantix-backend ./backend
#
# El Dockerfile de la raíz (frontend + Nginx) se conserva sin cambios.

FROM python:3.12-slim

# No generar bytecode .pyc y no almacenar en búfer la salida de los logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copiar primero solo las dependencias para aprovechar la caché de capas.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend (el .dockerignore excluye artefactos locales).
COPY . .

# Render inyecta la variable de entorno PORT; 10000 es el valor por defecto.
EXPOSE 10000

# Escucha en todas las interfaces y usa el puerto de Render si está definido.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
