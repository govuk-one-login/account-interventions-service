export const axios = require('axios').default;

export const instance = axios.create({
  // url: 'https://vpce-svc-0762b4928b8687636.execute-api.eu-west-2.vpce.amazonaws.com/v1',
  method: 'get',
  // path: '/ais/',
  port: 80,
  timeout: 1000
  // host: '072ifz6cp9.execute-api.eu-west-2.amazonaws.com'
});
