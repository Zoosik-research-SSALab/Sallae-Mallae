FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN corepack enable \
    && corepack prepare pnpm@latest --activate \
    && pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start"]
