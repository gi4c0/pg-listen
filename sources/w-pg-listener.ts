import * as pg from 'pg';
import * as format from 'pg-format';
import { EventEmitter } from 'events';
import { WPgNotificationType, WPgOptionsType } from './types';
import TypedEventEmitter from 'typed-emitter';
import { WPgListenEventsType } from './types/pg/w-pg-listen-events.type';
import { WAsyncThrowableType, wErrorCreator, wNothing, WNothingType } from '@w-utility';
import { forwardDBNotificationEvents } from './fn/forward-db-notification-events';
import { scheduleParanoidChecking } from './fn/schedule-paranoid-checker';
import { wPgReconnect } from './fn/w-pg-reconnect';
import { WReturnNothingFuncType } from './types/util/w-return-nothing-func.type';

export class WPgListener {
  /**
   * DB Client
   */
  private dbClient: pg.Client;

  /**
   * Channels given by user to subscribe
   */
  private subscribedChannels: Set<string> = new Set<string>();

  /**
   * Indicates if user is closing connection right now
   */
  private isClosing: boolean = false;

  /**
   * Indicates connection is reinitializing right now
   */
  private isReinitializing: boolean = false;

  /**
   * PG Client config
   */
  private connectionConfig: pg.ClientConfig;

  /**
   * Options
   */
  private options: WPgOptionsType;

  /**
   * Our internal event emitter
   */
  private emitter: TypedEventEmitter<WPgListenEventsType> = new EventEmitter() as TypedEventEmitter<WPgListenEventsType>;

  /**
   * Event emitter for notifications
   */
  private notificationsEmitter: EventEmitter = new EventEmitter();

  /**
   * Cancels event forwarding for this.emitter. Needed for reinitialization. Will be assigned later.
   */
  private cancelEventForwarding: WReturnNothingFuncType = () => wNothing;

  /**
   * Cancels (setInterval) paranoid checking. Needed for reinitialization. Will be assigned later.
   */
  private cancelParanoidChecking: WReturnNothingFuncType = () => wNothing;

  public constructor(connectionConfig?: pg.ClientConfig, options: Partial<WPgOptionsType> = {}) {
    this.connectionConfig = connectionConfig || {};
    this.options = {
      paranoidChecking: options.paranoidChecking || 3000,
      parse: options.parse || JSON.parse,
      serialize: options.serialize || JSON.stringify,
      native: options.native || false,
      retryInterval: options.retryInterval || 500,
      retryLimit: options.retryLimit || Infinity,
      retryTimeout: options.retryTimeout || 3000
    };

    this.emitter.setMaxListeners(0);
    this.notificationsEmitter.setMaxListeners(0);

    this.emitter.on('notification', (notification: WPgNotificationType): WNothingType => {
      this.notificationsEmitter.emit(notification.channel, notification.payload);
      return;
    });

    this.dbClient = this.createClient();
  }

  /**
   * Getter for events emitter
   */
  public get events(): TypedEventEmitter<WPgListenEventsType> {
    return this.emitter;
  }

  /**
   * Getter for events notification emitter
   */
  public get notifications(): EventEmitter {
    return this.notificationsEmitter;
  }

  /**
   * Connects to DB
   */
  public async connect(): WAsyncThrowableType<WNothingType> {
    this.initialize();
    await this.dbClient.connect();

    this.emitter.emit('connected');
    return;
  }

  /**
   * Closes connection to DB
   */
  public async close(): WAsyncThrowableType<WNothingType> {
    this.isClosing = true;
    this.cancelParanoidChecking();

    await this.dbClient.end();
    return;
  }

  /**
   * Retrieves subscribed channels
   */
  public getSubscribedChannels(): ReadonlyArray<string> {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Subscribe to channel
   */
  public async listenTo(channelName: string): WAsyncThrowableType<WNothingType> {
    if (this.subscribedChannels.has(channelName)) {
      return;
    }

    this.subscribedChannels.add(channelName);

    return this.dbClient
      .query(`LISTEN ${format.ident(channelName)}`)
      .then<WNothingType>(() => wNothing);
  }

  /**
   * Send notification
   */
  public notify(channelName: string, payload?: any): Promise<pg.QueryResult> {
    const serializedPayload: string = (
      payload !== wNothing
        ? `, ${format.literal(this.options.serialize(payload))}`
        : ''
    );

    return this.dbClient.query(`NOTIFY ${format.ident(channelName)}${serializedPayload}`);
  }

  /**
   * Unsubscribe from channel
   */
  public async unlisten(channelName: string): WAsyncThrowableType<WNothingType> {
    if (!this.subscribedChannels.has(channelName)) {
      return;
    }

    this.subscribedChannels.delete(channelName);

    return this.dbClient
      .query(`UNLISTEN ${format.ident(channelName)}`)
      .then<WNothingType>(() => wNothing);
  }

  /**
   * Unsubscribe from all existing channels
   */
  public unlistenAll(): WAsyncThrowableType<pg.QueryResult> {
    this.subscribedChannels = new Set();
    return this.dbClient.query(`UNLISTEN *`);
  }

  /**
   * Initializes notifications forwarding to our listeners and listen for errors from dbClient
   */
  private initialize(): WNothingType {
    // Wire the DB client events to our exposed emitter's events
    this.cancelEventForwarding = forwardDBNotificationEvents(
      this.dbClient,
      this.emitter,
      this.options.parse
    );

    this.dbClient.on('error', this.onDBClientErrorHandler);
    this.dbClient.on('end', this.onDBClientErrorHandler);

    if (this.options.paranoidChecking) {
      this.cancelParanoidChecking = scheduleParanoidChecking(
        this.dbClient,
        this.options.paranoidChecking,
        this.reinitialize
      );
    }

    return;
  }

  /**
   * Handler for dbClient 'error' or 'end' event
   */
  private onDBClientErrorHandler(): WNothingType {
    if (!this.isReinitializing) {
      this.reinitialize();
    }
    return;
  }

  /**
   * Re-initializes the connection (e.g. if error occured)
   */
  private async reinitialize(): WAsyncThrowableType<WNothingType> {
    if (this.isReinitializing || this.isClosing) {
      return;
    }

    this.isReinitializing = true;

    try {
      this.cancelParanoidChecking();
      this.cancelEventForwarding();

      this.dbClient.removeAllListeners();
      this.dbClient.end();

      this.dbClient = await wPgReconnect(
        this.connectionConfig,
        this.options,
        (attempt: number): boolean => this.emitter.emit('reconnect', attempt)
      );

      this.initialize();

      const subscribedChannelsArray = Array.from(this.subscribedChannels);

      await Promise.all(
        subscribedChannelsArray.map<Promise<WNothingType>>(
          (channelName: string) => this.dbClient
            .query(`LISTEN ${format.ident(channelName)}`)
            .then<WNothingType>(() => wNothing)
        )
      );

      this.emitter.emit('connected');
    } catch (originalError) {
      this.emitter.emit(
        'error',
        wErrorCreator(`Re-initializing the PostgreSQL notification client after connection loss failed: ${originalError.message}`)
      );
    } finally {
      this.isReinitializing = false;
    }

    return;
  }

  /**
   * Creates new client
   */
  private createClient(): pg.Client {
    const effectiveConnectionConfig: pg.ClientConfig = { ...this.connectionConfig, keepAlive: true };
    const Client = this.options.native && pg.native ? pg.native.Client : pg.Client;

    return new Client(effectiveConnectionConfig);
  }
}
