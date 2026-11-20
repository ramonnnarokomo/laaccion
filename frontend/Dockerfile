# --- Compilación ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
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
