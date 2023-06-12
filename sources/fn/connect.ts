import * as pg from 'pg';
import { WMaybeType, WAsyncThrowableType, wErrorCreator } from '@w-utility';
import { delay } from '../helpers/delay.helper';
import { WPgOptionsType, WPgConnectResultType, WPgReconnectFunctionType } from '../types';

export function connect(
  connectionConfig: WMaybeType<pg.ClientConfig>,
  options: WPgOptionsType
): WPgConnectResultType {
  const { retryInterval = 500, retryLimit = Infinity, retryTimeout = 3000 } = options;
  const effectiveConnectionConfig: pg.ClientConfig = { ...connectionConfig, keepAlive: true };

  const Client = options.native && pg.native ? pg.native.Client : pg.Client;
  const dbClient = new Client(effectiveConnectionConfig);
  const getRetryInterval = typeof retryInterval === 'function' ? retryInterval : () => retryInterval;

  const reconnect: WPgReconnectFunctionType = async (onAttempt: (attempt: number) => void): WAsyncThrowableType<pg.Client> => {
    const startTime: number = Date.now();

    for (let attempt = 1; attempt < retryLimit || !retryLimit; attempt++) {
      onAttempt(attempt);

      try {
        const newClient: pg.Client = new Client(effectiveConnectionConfig);

        const connecting: Promise<void> = new Promise((resolve, reject) => {
          newClient.once('connect', resolve);
          newClient.once('end', () => reject(Error('Connection ended.')));
          newClient.once('error', reject);
        });

        await Promise.all([newClient.connect(), connecting]);

        return newClient;
      } catch (error) {
        await delay(getRetryInterval(attempt - 1));

        if (retryTimeout && (Date.now() - startTime) > retryTimeout) {
          throw wErrorCreator(`Stopping PostgreSQL reconnection attempts after ${retryTimeout}ms timeout has been reached.`);
        }
      }
    }

    throw wErrorCreator('Reconnecting notification client to PostgreSQL database failed.');
  };

  return {
    dbClient,
    reconnect
  };
}
