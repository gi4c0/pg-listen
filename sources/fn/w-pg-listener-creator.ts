import * as pg from 'pg';
import TypedEventEmitter from 'typed-emitter';
import { WNothingType } from '@w/utility';
import { WPgListenEventsType, WPgNotificationType } from '../type';
import { wPgListenUnsubscriberCreator } from './w-pg-listen-unsubscriber-creator';
import { wPgListenEventHandlerCreator } from './w-pg-listen-event-handler-creator';

/**
 * Forwards notification event to our notification event emitter
 */
export function wPgListenerCreator(
  dbClient: pg.Client,
  emitter: TypedEventEmitter<WPgListenEventsType>,
  parser: (stringifiedData: string) => any
): () => WNothingType {
  const notificationHandler: (n: WPgNotificationType<string>) => WNothingType = wPgListenEventHandlerCreator(
    emitter,
    parser
  );

  dbClient.on('notification', notificationHandler);
  return wPgListenUnsubscriberCreator(dbClient, notificationHandler);
}

