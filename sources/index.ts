import * as pg from 'pg';
import { WAsyncThrowableType, wNothing, WNothingType } from '@w-utility';
import { EventEmitter } from 'events';
import * as format from 'pg-format';
import TypedEventEmitter from 'typed-emitter';
import { WPgOptionsType, WPgNotificationType } from './types';
import { clientCreator } from './fn/client-creator';
import { WPgListenEventsType } from './types/pg/w-pg-listen-events.type';
import { forwardDBNotificationEvents } from './fn/forward-db-notification-events';
import { scheduleParanoidChecking } from './fn/schedule-paranoid-checker';
import { WPgSubscriberType } from './types/w-pg-subscriber.type';

export default function createPostgresSubscriber<Events extends Record<string, any>> (
  connectionConfig?: pg.ClientConfig,
  options: WPgOptionsType = {}
): WPgSubscriberType<Events> {
  const {
    paranoidChecking = 30000,
    parse = JSON.parse,
    serialize = JSON.stringify
  } = options;

  const emitter: TypedEventEmitter<WPgListenEventsType> = new EventEmitter() as TypedEventEmitter<WPgListenEventsType>;
  emitter.setMaxListeners(0);    // Unlimited listeners

  const notificationsEmitter: EventEmitter = new EventEmitter();
  notificationsEmitter.setMaxListeners(0);   // Unlimited listeners

  emitter.on('notification', (notification: WPgNotificationType): WNothingType => {
    notificationsEmitter.emit(notification.channel, notification.payload);
    return;
  });

  const { dbClient: initialDBClient, reconnect } = clientCreator(connectionConfig, options);

  let closing: boolean = false;
  let dbClient: pg.Client = initialDBClient;
  let reinitializingRightNow: boolean = false;
  let subscribedChannels: Set<string> = new Set();

  let cancelEventForwarding: () => WNothingType = () => wNothing;
  let cancelParanoidChecking: () => WNothingType = () => wNothing;

  function initialize(client: pg.Client): WNothingType {
    // Wire the DB client events to our exposed emitter's events
    cancelEventForwarding = forwardDBNotificationEvents(client, emitter, parse);

    dbClient.on('error', (_error: any): WNothingType => {
      if (!reinitializingRightNow) {
        reinitialize();
      }
      return;
    });

    dbClient.on('end', (): WNothingType => {
      if (!reinitializingRightNow) {
        reinitialize();
      }
      return;
    });

    if (paranoidChecking) {
      cancelParanoidChecking = scheduleParanoidChecking(client, paranoidChecking, reinitialize);
    }

    return;
  }

  // No need to handle errors when calling `reinitialize()`, it handles its errors itself
  async function reinitialize(): Promise<WNothingType> {
    if (reinitializingRightNow || closing) {
      return;
    }
    reinitializingRightNow = true;

    try {
      cancelParanoidChecking();
      cancelEventForwarding();

      dbClient.removeAllListeners();
      dbClient.end();

      dbClient = await reconnect((attempt: number): boolean => emitter.emit('reconnect', attempt));
      initialize(dbClient);

      const subscribedChannelsArray = Array.from(subscribedChannels);

      await Promise.all(subscribedChannelsArray.map<Promise<WNothingType>>(
        (channelName: string) => dbClient
          .query(`LISTEN ${format.ident(channelName)}`)
          .then<WNothingType>(() => wNothing)
      ));

      emitter.emit('connected');
    } catch (error) {
      error.message = `Re-initializing the PostgreSQL notification client after connection loss failed: ${error.message}`;
      emitter.emit('error', error);
    } finally {
      reinitializingRightNow = false;
    }
    return;
  }

  return {
    /** Emits events: "error", "notification" & "redirect" */
    events: emitter,

    /** For convenience: Subscribe to distinct notifications here, event name = channel name */
    notifications: notificationsEmitter,

    /** Don't forget to call this asynchronous method before doing your thing */
    async connect() {
      initialize(dbClient);
      await dbClient.connect();
      emitter.emit('connected');
    },

    close(): Promise<void> {
      closing = true;
      cancelParanoidChecking();
      return dbClient.end();
    },

    getSubscribedChannels(): ReadonlyArray<string> {
      return Array.from(subscribedChannels);
    },

    async listenTo(channelName: string): WAsyncThrowableType<WNothingType> {
      if (subscribedChannels.has(channelName)) {
        return;
      }

      subscribedChannels.add(channelName);

      return dbClient
        .query(`LISTEN ${format.ident(channelName)}`)
        .then<WNothingType>(() => wNothing);
    },

    notify(channelName: string, payload?: any): Promise<pg.QueryResult> {
      const serializedPayload: string = (
        payload !== wNothing
          ? `, ${format.literal(serialize(payload))}`
          : ''
      );

      return dbClient.query(`NOTIFY ${format.ident(channelName)}${serializedPayload}`);
    },

    unlisten(channelName: string) {
      if (!subscribedChannels.has(channelName)) {
        return;
      }

      subscribedChannels.delete(channelName);
      return dbClient.query(`UNLISTEN ${format.ident(channelName)}`);
    },

    unlistenAll() {
      subscribedChannels = new Set();
      return dbClient.query(`UNLISTEN *`);
    }
  };
}
