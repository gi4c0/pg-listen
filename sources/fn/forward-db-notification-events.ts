import { WNothingType } from '@w-utility/dist';
import * as pg from 'pg';
import TypedEventEmitter from 'typed-emitter';
import { WPgNotificationType } from '../types';
import { WPgListenEventsType } from '../types/pg/w-pg-listen-events.type';

export function forwardDBNotificationEvents(
  dbClient: pg.Client,
  emitter: TypedEventEmitter<WPgListenEventsType>,
  parse: (stringifiedData: string) => any
): () => WNothingType {
  const onNotification = (notification: WPgNotificationType<string>): void => {
    let payload: object;

    try {
      payload = notification.payload ? parse(notification.payload) : undefined;
    } catch (error) {
      error.message = `Error parsing PostgreSQL notification payload: ${error.message}`;
      emitter.emit('error', error);
      return;
    }

    emitter.emit('notification', {
      processId: notification.processId,
      channel: notification.channel,
      payload
    });
  };

  dbClient.on('notification', onNotification);

  return function cancelNotificationForwarding (): WNothingType {
    dbClient.removeListener('notification', onNotification);
    return;
  };
}

