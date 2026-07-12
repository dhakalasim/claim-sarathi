FROM node:20-slim AS base
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace @claimsarathi/shared --workspace @claimsarathi/web

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build --workspace @claimsarathi/shared

WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
