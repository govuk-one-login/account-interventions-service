import { FastifyRequest } from 'fastify';
import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Strips a trailing path parameter segment (e.g. `/{proxy+}` or `/{param}`) from a resource path,
 * returning the static prefix. Returns an empty string if there is no static prefix.
 */
export function stripTrailingPathParam(resourcePath: string | null | undefined): string {
  if (!resourcePath) return '';
  const braceIndex = resourcePath.lastIndexOf('{');
  const withoutParam = braceIndex > 0 ? resourcePath.slice(0, braceIndex) : resourcePath;
  return withoutParam.endsWith('/') ? withoutParam.slice(0, -1) : withoutParam;
}

/**
 * Derives the URL prefix that external clients use to reach this Lambda.
 *
 * Three cases:
 *
 * 1. External gateway (e.g. FAI) routes /interventions/\{proxy+\} to this Lambda.
 *    resourcePath = "/interventions/\{proxy+\}" → static prefix "/interventions".
 *    The stage name is irrelevant here because /interventions is a real path segment.
 *
 * 2. Own FrontendApi routes /\{proxy+\} to this Lambda.
 *    resourcePath = "/\{proxy+\}" → no static prefix from the path.
 *    \@fastify/aws-lambda strips the stage from the URL before Fastify sees it, so
 *    we must use event.requestContext.stage (e.g. "v1") as the prefix instead.
 *
 * 3. Local dev (no API Gateway event) → empty string.
 */
export function deriveStagePrefixFromEvent(event: APIGatewayProxyEvent | undefined): string {
  if (!event) return '';

  const { resourcePath, stage } = event.requestContext;

  // Strip the trailing {proxy+} wildcard (or any {param}) to get the static path prefix.
  const staticPrefix = stripTrailingPathParam(resourcePath);

  // A bare "/" means the root with no static prefix — treat as empty.
  if (staticPrefix && staticPrefix !== '/') {
    return staticPrefix;
  }

  // No static prefix: fall back to the stage name so asset URLs include /v1/assets/...
  return stage ? `/${stage}` : '';
};

/**
 * Derives the stage prefix for the current Fastify request.
 * Returns empty string when running locally (no API Gateway event).
 */
export function getStagePrefixForRequest(request: FastifyRequest): string {
  const event = (request as FastifyRequest & { awsLambda?: { event: APIGatewayProxyEvent } })
    .awsLambda?.event;
  return deriveStagePrefixFromEvent(event);
};
