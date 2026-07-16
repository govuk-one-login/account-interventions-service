import  express, { type Express, type Request, type Response } from 'express';
import { once } from 'node:events';
import { AddressInfo } from 'node:net';

export interface TestServerConfig {
  accounts?: Record<string, { interventions: { name: string }[] }>;
  malformed?: boolean;
  simulateServerError?: boolean;
}

export interface TestServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

export async function createTestServer(config: TestServerConfig): Promise<TestServer> {
  const app: Express = express();

  app.get('/v2/ais/:userId', (req: Request, res: Response) => {
    if (config.simulateServerError) {
      res.status(500).json({ message: 'Internal Server Error.' });
      return;
    }

    const userId = req.params['userId'] as string;

    if (/[,\s]/.test(userId)) {
      res.status(400).json({ message: 'Invalid Request.' });
      return;
    }

    if (config.malformed) {
      res.set('Content-Type', 'application/json');
      res.status(200).send('not json {{{');
      return;
    }

    const account = config.accounts?.[userId];

    if (!account) {
      res.status(200).json({ interventions: [] });
      return;
    }

    res.status(200).json(account);
  });

  const server = app.listen(0, '127.0.0.1');
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
