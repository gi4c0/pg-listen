import * as pg from 'pg';
import { WNothingType } from '@w/utility';
import { WPgNotificationType } from '../type';

export function wPgListenUnsubscriberCreator(
  dbClient: pg.Client,
  onNotificationHandler: (n: WPgNotificationType<string>) => WNothingType
) {
  return (): WNothingType => void dbClient.removeListener(
    'notification',
    onNotificationHandler
  );
}
