# Set the base image.
FROM node:24

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
