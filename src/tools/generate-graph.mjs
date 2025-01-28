import { transitionConfiguration } from '../services/account-states/config';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const html = readFileSync('./graph.html');

createServer((request, res) => {
  res.end(html);
});
