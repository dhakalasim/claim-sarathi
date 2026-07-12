FROM node:20-slim AS base
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspace @claimsarathi/shared --workspace @claimsarathi/api

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace @claimsarathi/shared
RUN npm exec --workspace @claimsarathi/api -- prisma generate
RUN npm run build --workspace @claimsarathi/api

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
