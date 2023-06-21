import * as pg from 'pg';
import { WAsyncThrowableType, wErrorCreator, WNothingType, wSleep } from '@w/utility';
import { WPgOptionsType } from '../type';
import { wPgListenRetryIntervalCreator } from './w-pg-listen-retry-interval-creator';

export async function wPgListenReconnecter(
  connectionConfig: pg.ClientConfig = {},
  options: Required<WPgOptionsType>,
  onAttempt: (attempt: number) => void
): WAsyncThrowableType<pg.Client> {
  const effectiveConnectionConfig: pg.ClientConfig = {
    ... connectionConfig,
    keepAlive: true
  };
  const ClientConstructor: typeof pg.Client = options.native && pg.native ? pg.native.Client : pg.Client;
  const startTime: number = Date.now();

  for (let attempt: number = 1; attempt < options.retryLimit || !options.retryLimit; attempt++) {
    onAttempt(attempt);

    try {
      const newClient: pg.Client = new ClientConstructor(effectiveConnectionConfig);

      const connecting: Promise<void> = new Promise((resolve, reject): WNothingType => {
        newClient.once('connect', resolve);
        newClient.once('end', () => reject(wErrorCreator('Connection ended')));
        return void newClient.once('error', reject);
      });

      await Promise.all([
        newClient.connect(),
        connecting
      ]);

      return newClient;
    } catch (error) {
      await wSleep(wPgListenRetryIntervalCreator(options, attempt - 1));

      if (options.retryTimeout && (Date.now() - startTime) > options.retryTimeout) {
        throw wErrorCreator(`Stopping PostgreSQL reconnection attempts after ${options.retryTimeout}ms timeout has been reached`);
      }
    }
  }

  throw wErrorCreator('Reconnecting notification client to PostgreSQL database failed.');
}
