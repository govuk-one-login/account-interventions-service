#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="dynamodb-local"
PORT=8000
IMAGE="amazon/dynamodb-local:latest"
MAX_RETRIES=10
RETRY_INTERVAL=2

# Stop and remove existing container if present
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing ${CONTAINER_NAME} container..."
  docker rm -f "${CONTAINER_NAME}" > /dev/null
fi

echo "Starting ${CONTAINER_NAME} on port ${PORT}..."
docker run -d -p "${PORT}:${PORT}" --name "${CONTAINER_NAME}" "${IMAGE}"

echo "Waiting for ${CONTAINER_NAME} to be ready..."
for i in $(seq 1 "${MAX_RETRIES}"); do
  if curl -s -o /dev/null "http://localhost:${PORT}"; then
    echo "${CONTAINER_NAME} is ready."
    exit 0
  fi
  echo "  Attempt ${i}/${MAX_RETRIES} - not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep "${RETRY_INTERVAL}"
done

echo "ERROR: ${CONTAINER_NAME} did not become ready after $((MAX_RETRIES * RETRY_INTERVAL))s"
docker logs "${CONTAINER_NAME}"
exit 1
