// import { instance } from "./axiosConfig";
import { axios } from './axios-config';

// export async function getRequest(user: string) {
//   try {
//     const response = await instance.get(user);
//     console.log(response);
//     return JSON.parse(response);
//   } catch (error) {
//     console.log(error);
//   }
// }
export async function getRequest(userId: string) {
  const options = {
    baseURL: 'https://vpce-svc-0762b4928b8687636.execute-api.eu-west-2.vpce.amazonaws.com/v1',
    Host: '072ifz6cp9.execute-api.eu-west-2.amazonaws.com',
    path: '/ais/' + userId,
    port: 80,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  try {
    await axios.get(options);
  } catch (error) {
    console.log(error);
  }
}
// headers: { Accept: 'text/html, application/json, text/plain, */*' },
// method: 'get',
// path: '/ais/' + userId,
