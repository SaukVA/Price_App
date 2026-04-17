# =================================================================
#  Price Display — Dockerfile
#  Sirve la web estática con nginx e inyecta la URL de la API
#  en config.json a través de la variable API_BASE_URL del .env
# =================================================================

FROM nginx:alpine

# Copia todos los archivos estáticos al directorio de nginx
COPY . /usr/share/nginx/html

# Copia el script de entrada que inyecta la URL de la API
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
