import { instance } from './axios-config';
//import { axios } from './axios-config';

export async function getRequest(userId: string) {
  try {
    await instance.get(userId);
  } catch (error) {
    console.log(error);
  }
}

//
// export async function getRequest(user: string) {
//   try {
//     const response = await instance.get(user);
//     console.log(response);
//     return JSON.parse(response);
//   } catch (error) {
//     console.log(error);
//   }
// }

//
// const options = {
//   url: 'https://vpce-svc-0762b4928b8687636.execute-api.eu-west-2.vpce.amazonaws.com/v1',
//   method: 'get',
//   Host: '072ifz6cp9.execute-api.eu-west-2.amazonaws.com',
//   params: '/ais/' + userId,
//   port: 80,
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   timeout: 1000,
// };

//
// headers: { Accept: 'text/html, application/json, text/plain, */*' },
// method: 'get',
// path: '/ais/' + userId,
// await axios.get({
//   url: 'https://vpce-svc-0762b4928b8687636.execute-api.eu-west-2.vpce.amazonaws.com/v1',
//   method: 'get',
//   path: '/ais/' + userId,
//   port: 80,
//   host: '072ifz6cp9.execute-api.eu-west-2.amazonaws.com',
// });
