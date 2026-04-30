# Set the base image.
FROM amazonlinux:latest
RUN yum install -y gcc-c++ make && \
    curl -sL https://rpm.nodesource.com/setup_24.x | bash - && \
    yum install -y nodejs

WORKDIR /app

ARG TARGETARCH

# Set up AWS CLI
RUN if [ "$TARGETARCH" = "arm64" ]; then \
    URL="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"; \
    else \
    URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"; \
    fi && \
    curl -sL "$URL" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# COPY Files from src directory
COPY package.json package-lock.json tsconfig.json vitest.config.ts /
RUN npm ci

COPY tests/ /tests
COPY apiEndpoints/ /apiEndpoints
COPY utils/ /utils

COPY run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

ENTRYPOINT [ "/run-tests.sh" ]
