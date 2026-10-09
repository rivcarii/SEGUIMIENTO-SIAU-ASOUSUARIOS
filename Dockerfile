# Plataforma de evidencias SIAU. Sin dependencias: solo Node 22.
FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY *.mjs ./
COPY web ./web
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data TRUST_PROXY=1
# /data debe ser un disco persistente: ahí quedan la base de datos y las fotos.
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Arranca como root solo para dar permisos al disco montado (suele llegar con dueño root) y luego baja a un usuario sin privilegios.
CMD ["sh", "-c", "chown -R node:node \"$DATA_DIR\" && exec setpriv --reuid=node --regid=node --init-groups node server.mjs"]
