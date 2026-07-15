import { APIGatewayProxyEvent } from 'aws-lambda';
import { deriveStagePrefixFromEvent, stripTrailingPathParam } from '../stage-prefix';

const makeEvent = (resourcePath: string, stage: string): APIGatewayProxyEvent =>
  ({ requestContext: { resourcePath, stage } } as unknown as APIGatewayProxyEvent);

describe('stripTrailingPathParam', () => {
  it('strips a trailing {proxy+} segment and its leading slash', () => {
    expect(stripTrailingPathParam('/interventions/{proxy+}')).toBe('/interventions');
  });

  it('strips a plain {param} segment', () => {
    expect(stripTrailingPathParam('/users/{userId}')).toBe('/users');
  });

  it('returns empty string when the path is only a param segment', () => {
    expect(stripTrailingPathParam('/{proxy+}')).toBe('');
  });

  it('returns the path unchanged when there are no param segments', () => {
    expect(stripTrailingPathParam('/interventions')).toBe('/interventions');
  });

  it('returns empty string for null', () => {
    expect(stripTrailingPathParam(undefined)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(stripTrailingPathParam(undefined)).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(stripTrailingPathParam('')).toBe('');
  });
});

describe('deriveStagePrefixFromEvent', () => {
  it('returns empty string when event is undefined', () => {
    expect(deriveStagePrefixFromEvent(undefined)).toBe('');
  });

  it('returns the static path prefix when routed via an external gateway', () => {
    // e.g. FAI routes /interventions/{proxy+} → prefix is /interventions
    expect(deriveStagePrefixFromEvent(makeEvent('/interventions/{proxy+}', 'v1'))).toBe(
      '/interventions',
    );
  });

  it('falls back to the stage name when resourcePath has no static prefix', () => {
    // Own FrontendApi routes /{proxy+} → no static prefix, use stage
    expect(deriveStagePrefixFromEvent(makeEvent('/{proxy+}', 'v1'))).toBe('/v1');
  });

  it('returns empty string when there is no static prefix and stage is empty', () => {
    expect(deriveStagePrefixFromEvent(makeEvent('/{proxy+}', ''))).toBe('');
  });

  it('does not use the stage when a static prefix is present', () => {
    // Stage should be ignored if we already have a meaningful static prefix
    expect(deriveStagePrefixFromEvent(makeEvent('/interventions/{proxy+}', 'prod'))).toBe(
      '/interventions',
    );
  });
});
