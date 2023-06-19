import { WNothingType } from '@w/utility';
import * as pg from 'pg';

export function scheduleParanoidChecking(
  dbClient: pg.Client,
  intervalTime: number,
  reconnect: () => Promise<void>
): () => WNothingType {
  const scheduledCheck = async () => {
    try {
      await dbClient.query('SELECT pg_backend_pid()');
    } catch (err) {
      await reconnect();
    }
  };

  const interval: NodeJS.Timer = setInterval(scheduledCheck, intervalTime);

  return function unschedule(): WNothingType {
    clearInterval(interval);
    return;
  };
}

