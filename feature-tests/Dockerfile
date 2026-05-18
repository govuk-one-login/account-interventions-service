# Set the base image.
FROM amazon/aws-cli:latest
RUN yum install -y gcc-c++ make && \
    curl -sL https://rpm.nodesource.com/setup_24.x | bash - && \
    yum install -y nodejs

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
