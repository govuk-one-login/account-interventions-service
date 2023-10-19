import logger from '../logger';

jest.mock('@aws-lambda-powertools/logger');

describe('logger', () => {
  it('exports logger', () => {
    const spiedOn = jest.spyOn(logger, 'info');
    logger.info('test');
    expect(spiedOn).toHaveBeenCalledWith('test');
    expect(spiedOn).toHaveBeenCalledTimes(1);
  });
});
