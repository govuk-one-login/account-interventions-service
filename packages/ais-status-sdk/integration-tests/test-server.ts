import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { AddressInfo } from 'node:net';

export interface TestServerConfig {
  responseBody?: unknown;
  statusCode?: number;
  // delayMs?: number;
  malformed?: boolean;
  // onRequest?: (req: IncomingMessage) => void;
}

interface TestServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

export async function createTestServer(config: TestServerConfig): Promise<TestServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    //set headers
    const statusCode = config.statusCode ?? 200;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });

    if (config.malformed) {
      res.end('not json {{{');
      return;
    }

    const body = config.responseBody ?? { interventions: [] };
    res.end(JSON.stringify(body));
  
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port.toString()}`;
  return {
    baseUrl,
    stop: async () => {
      server.close();
      await once(server, 'close');
    }
  }
}