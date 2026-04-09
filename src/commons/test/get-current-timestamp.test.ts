import { getCurrentTimestamp } from '../get-current-timestamp';

describe('currentTimestampInSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2023, 2, 13)).getTime());
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should return the Unix timestamp in seconds on 13 March 2023 00:00:00 UTC', () => {
    const response = getCurrentTimestamp();
    expect(response.seconds).toEqual(1_678_665_600);
    expect(response.milliseconds).toEqual(1_678_665_600_000);
    expect(response.isoString).toEqual('2023-03-13T00:00:00.000Z');
  });
});
