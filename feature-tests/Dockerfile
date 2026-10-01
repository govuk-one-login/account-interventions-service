FROM node:24@sha256:64af3819f9275802414d7cdc38c27e9d82bd564dec4d4da87d008255d36c63b4

WORKDIR /app

# COPY Files from src directory
COPY package.json package-lock.json tsconfig.json vitest.config.ts /
RUN npm ci

COPY tests/ /tests
COPY apiEndpoints/ /apiEndpoints
COPY utils/ /utils

COPY run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

ENTRYPOINT [ "/run-tests.sh" ]
