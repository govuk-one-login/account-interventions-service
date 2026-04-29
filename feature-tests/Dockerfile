# Set the base image.
FROM amazonlinux:latest
RUN yum install -y gcc-c++ make
RUN curl -sL https://rpm.nodesource.com/setup_24.x | bash -
RUN yum install -y nodejs

WORKDIR /

# Set up AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

# COPY Files from src directory
COPY package.json /package.json
COPY package-lock.json /package-lock.json
COPY tsconfig.json /tsconfig.json
COPY vitest.config.ts /vitest.config.ts
COPY tests/ /tests
COPY apiEndpoints/ /apiEndpoints
COPY utils/ /utils
COPY run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

RUN npm install
ENTRYPOINT [ "/run-tests.sh" ]
