import { Buffer } from 'node:buffer';
import * as crypto from 'node:crypto';
import { randomString } from './utility';
import { vcs } from './vcs-types-array';

function formJWT(vcObject: object) {
  const header = getHeader('base64');
  const signature = getRandomSignature(vcObject);
  const payload = Buffer.from(JSON.stringify(vcObject)).toString('base64url');
  return `${header}.${payload}.${signature}`;
}
function getHeader(encoding: BufferEncoding) {
  const headerObject = {
    alg: 'HS256',
    typ: 'JWT',
  };
  return Buffer.from(JSON.stringify(headerObject)).toString(encoding);
}
function getRandomSignature(payload: object): string {
  const b64URLEncodedHeader = getHeader('base64url');
  const b64URLEncodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const randomFakeKey = Buffer.from(randomString(32)).toString('base64');

  const hash = crypto
    .createHmac('sha256', randomFakeKey)
    .update(b64URLEncodedHeader + '.' + b64URLEncodedPayload)
    .digest('base64url');

  if (hash.at(-1) === '=') return hash.slice(0, -1);
  return hash;
}

export function getArrayOfValidVcTokens(numberOfVCsTokenToGenerate: number) {
  const vcsTypes = [
    'addressVCS',
    'drivingLicenceVCS',
    'fraudVCS',
    'kbvVCS',
    'passportVCS',
    'biometricVCS',
    'claimedIdentityVCS',
    'face2faceVCS',
  ];
  //Object.keys[vcs]
  const vcsTokenArray = [];
  for (let index = 0; index < numberOfVCsTokenToGenerate; index++) {
    const selectedVCType: any = vcsTypes[Math.floor(Math.random() * vcsTypes.length)];
    const randomVCBody = getRandomVcsByVcType(selectedVCType);
    vcsTokenArray.push(formJWT(randomVCBody));
  }
  return vcsTokenArray;
}

export function getVcTokensbasedOnVcType(VCsType: keyof typeof vcs) {
  const vcsTokenArray = [];
  const randomVCBody = getRandomVcsByVcType(VCsType);
  vcsTokenArray.push(formJWT(randomVCBody));
  return vcsTokenArray;
}

export function getRandomVcsByVcType(VCsType: keyof typeof vcs) {
  const array = vcs[VCsType];
  const randomVCBody = array[Math.floor(Math.random() * array.length)];
  return randomVCBody;
}
