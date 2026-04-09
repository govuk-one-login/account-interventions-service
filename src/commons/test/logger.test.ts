import logger from '../logger';

vi.mock('@aws-lambda-powertools/logger');

describe('logger', () => {
  it('exports logger', () => {
    const spiedOn = vi.spyOn(logger, 'info');
    logger.info('test');
    expect(spiedOn).toHaveBeenCalledWith('test');
    expect(spiedOn).toHaveBeenCalledTimes(1);
  });
});
