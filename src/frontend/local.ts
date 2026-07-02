import { InterventionName, InterventionStub } from '@govuk-one-login/ais-status-sdk';
import { init } from './app';

init(
  new InterventionStub({
    interventionNames: [InterventionName.RESET_PASSWORD],
  }),
).listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
