# --- Compilación ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci exige que package-lock.json cuadre al 100%. Si se ha regenerado con otra versión de npm
# (pasa en Windows con npm 10: quita dependencias opcionales de WebAssembly), se cae a npm install.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- Ejecución --- (el servidor SSR ya va empaquetado en dist: no hacen falta node_modules)
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
