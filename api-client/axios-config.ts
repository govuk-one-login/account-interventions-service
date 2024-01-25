export const axios = require('axios');

export const instance = axios.create({
  baseURL: 'https://072ifz6cp9.execute-api.eu-west-2.amazonaws.com/v1/ais/',
  timeout: 1000,
});
