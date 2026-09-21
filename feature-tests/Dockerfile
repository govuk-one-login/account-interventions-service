# Set the base image.
FROM node:24

RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip curl && \
    curl -fSsL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o awscliv2.zip && \
    unzip -q awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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
