/* istanbul ignore file -- only use to run locally */

import { init } from './app';

init().listen({ port: 3000 }, (error) => {
  if (error) console.error(error);
  console.log('Server running at http://localhost:3000/');
});
