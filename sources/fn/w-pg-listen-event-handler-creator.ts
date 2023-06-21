import TypedEventEmitter from 'typed-emitter';
import { wNothing, WNothingType } from '@w/utility';
import { WPgListenEventsType, WPgNotificationType } from '../type';

export function wPgListenEventHandlerCreator(
  emitter: TypedEventEmitter<WPgListenEventsType>,
  parser: (stringifiedData: string) => any
): (notification: WPgNotificationType<string>) => WNothingType {
  return (notification: WPgNotificationType<string>): WNothingType => {
    let payload: object;

    try {
      payload = notification.payload ? parser(notification.payload) : wNothing;
    } catch (error) {
      error.message = `PostgreSQL notification payload cannot be parsed: ${error.message}`;
      return void emitter.emit('error', error);
    }

    return void emitter.emit(
      'notification',
      {
        processId: notification.processId,
        channel: notification.channel,
        payload
      }
    );
  };
}
