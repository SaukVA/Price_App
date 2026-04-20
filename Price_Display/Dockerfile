# =================================================================
#  Price Display — Dockerfile
#  Sirve la web estática con nginx.
#  Las peticiones /api/ se redirigen internamente a price_server,
#  por lo que la web funciona desde cualquier IP sin configuración.
# =================================================================

FROM nginx:alpine

# Copia todos los archivos estáticos al directorio de nginx
COPY . /usr/share/nginx/html

# Sustituye la configuración por defecto de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el script de entrada
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
