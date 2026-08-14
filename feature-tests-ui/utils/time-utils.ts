export interface CurrentTimeDescriptor {
  isoString: string;
  milliseconds: number;
  seconds: number;
}

const delay = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms));

export async function timeDelayForTestEnvironment(ms = 500) {
  console.log('Wait for endpoint operations to process');
  await delay(ms);
}
