import * as pg from 'pg';
import { WAsyncThrowableType, wErrorCreator } from '@w/utility';
import { delay } from '../helpers/delay.helper';
import { WPgOptionsType } from '../types';

export async function wPgReconnect(
  connectionConfig: pg.ClientConfig = {},
  options: Required<WPgOptionsType>,
  onAttempt: (attempt: number) => void
): WAsyncThrowableType<pg.Client> {
  const effectiveConnectionConfig: pg.ClientConfig = { ...connectionConfig, keepAlive: true };

  const Client: typeof pg.Client = options.native && pg.native ? pg.native.Client : pg.Client;

  const getRetryInterval: (attempt: number) => number = (
    typeof options.retryInterval === 'function'
      ? options.retryInterval
      : () => options.retryInterval
  ) as (attempt: number) => number;

  const startTime: number = Date.now();

  for (let attempt: number = 1; attempt < options.retryLimit || !options.retryLimit; attempt++) {
    onAttempt(attempt);

    try {
      const newClient: pg.Client = new Client(effectiveConnectionConfig);

      const connecting: Promise<void> = new Promise((resolve, reject) => {
        newClient.once('connect', resolve);
        newClient.once('end', () => reject(wErrorCreator('Connection ended.')));
        newClient.once('error', reject);
      });

      await Promise.all([newClient.connect(), connecting]);

      return newClient;
    } catch (error) {
      await delay(getRetryInterval(attempt - 1));

      if (options.retryTimeout && (Date.now() - startTime) > options.retryTimeout) {
        throw wErrorCreator(`Stopping PostgreSQL reconnection attempts after ${options.retryTimeout}ms timeout has been reached.`);
      }
    }
  }

  throw wErrorCreator('Reconnecting notification client to PostgreSQL database failed.');
}
