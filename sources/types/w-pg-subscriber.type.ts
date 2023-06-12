import * as EventEmitter from 'events';
import TypedEventEmitter from 'typed-emitter';
import { WPgListenEventsType } from './pg/w-pg-listen-events.type';
import { WPgSubscriberInterface } from '../interfaces/w-pg-subscriber.interface';

export type WPgSubscriberType<Events extends Record<string, any>> = WPgSubscriberInterface<Events> & Readonly<{
  /** Emits events: "error", "notification" & "redirect" */
  events: TypedEventEmitter<WPgListenEventsType>;
  /** For convenience: Subscribe to distinct notifications here, event name = channel name */
  notifications: EventEmitter;
}>;
