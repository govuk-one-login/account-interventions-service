const baseTestUserId = 'urn:fdc:gov.uk:2022:TEST_USER-';
const generatedTestUserIds: string[] = [];
export function generateRandomTestUserId() {
  const randomTestUserId = baseTestUserId.concat(
    randomString(10),
    '-',
    randomString(4),
    '-',
    randomString(1),
    '-',
    randomString(18),
  );
  generatedTestUserIds.push(randomTestUserId);
  console.log('RETURNING NEW USER ID: ' + randomTestUserId);
  return randomTestUserId;
}
export function urlEncodeUserID(userId: string) {
  return encodeURIComponent(userId);
}

export function getNumberOfUserIdsGenerated() {
  return generatedTestUserIds.length;
}

export function getLatestUserId() {
  const latest = generatedTestUserIds.pop();
  if (!latest) throw new Error('no user ids were generated so far');
  return latest;
}

function randomString(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
