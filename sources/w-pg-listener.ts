import * as pg from 'pg';
import * as pgFormat from 'pg-format';
import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { WAsyncThrowableType, wErrorCreator, wNothing, WNothingType } from '@w/utility';
import { wPgListenerCreator, wPgListenParanoidCheckScheduler, wPgListenReconnecter } from './fn';
import { WPgListenEventsType, WPgNotificationType, WPgOptionsType } from './type';

export class WPgListener {
  /**
   * Method creates options for the PG with default values for properties, omitted by user
   */
  private static createOptions(options: Partial<WPgOptionsType> = {}): WPgOptionsType {
    return {
      paranoidChecking: options.paranoidChecking || 3000,
      parse: options.parse || JSON.parse,
      serialize: options.serialize || JSON.stringify,
      native: options.native || false,
      retryInterval: options.retryInterval || 500,
      retryLimit: options.retryLimit || Infinity,
      retryTimeout: options.retryTimeout || 3000
    };
  }

  /**
   * DB Client
   */
  private dbClient: pg.Client;

  /**
   * Channels given by user to subscribe
   */
  private readonly subscribedChannels: Set<string> = new Set<string>();

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
  private readonly connectionConfig: pg.ClientConfig;

  /**
   * Options
   */
  private readonly options: WPgOptionsType;

  /**
   * Our internal event emitter
   */
  private readonly emitter: TypedEventEmitter<WPgListenEventsType> = new EventEmitter() as TypedEventEmitter<WPgListenEventsType>;

  /**
   * Event emitter for notifications
   */
  private readonly notificationsEmitter: EventEmitter = new EventEmitter();

  /**
   * Cancels event forwarding for this.emitter. Needed for reinitialization. Will be assigned later.
   */
  private cancelEventForwarding: () => WNothingType = () => wNothing;

  /**
   * Cancels (setInterval) paranoid checking. Needed for reinitialization. Will be assigned later.
   */
  private paranoidCheckCanceler: () => WNothingType = () => wNothing;

  public constructor(connectionConfig?: pg.ClientConfig, options?: Partial<WPgOptionsType>) {
    this.connectionConfig = connectionConfig || {};
    this.options = WPgListener.createOptions(options);

    this.emitter.setMaxListeners(0);
    this.notificationsEmitter.setMaxListeners(0);

    this.emitter.on(
      'notification',
      (notification: WPgNotificationType): WNothingType => void this.notificationsEmitter.emit(
        notification.channel,
        notification.payload
      )
    );

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
    return void this.emitter.emit('connected');
  }

  /**
   * Closes connection to DB
   */
  public async close(): WAsyncThrowableType<WNothingType> {
    this.isClosing = true;
    this.paranoidCheckCanceler();
    return void this.dbClient.end();
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

    return this
      .dbClient
      .query(`LISTEN ${pgFormat.ident(channelName)}`)
      .then<WNothingType>(() => wNothing);
  }

  /**
   * Send notification
   */
  public notify(channelName: string, payload?: any): Promise<pg.QueryResult> {
    const serializedPayload: string = (
      payload !== wNothing
        ? `, ${pgFormat.literal(this.options.serialize(payload))}`
        : ''
    );

    return this.dbClient.query(`NOTIFY ${pgFormat.ident(channelName)}${serializedPayload}`);
  }

  /**
   * Unsubscribe from channel
   */
  public async unlisten(channelName: string): WAsyncThrowableType<WNothingType> {
    if (!this.subscribedChannels.has(channelName)) {
      return;
    }

    this.subscribedChannels.delete(channelName);

    return this
      .dbClient
      .query(`UNLISTEN ${pgFormat.ident(channelName)}`)
      .then<WNothingType>(() => wNothing);
  }

  /**
   * Unsubscribe from all existing channels
   */
  public unlistenAll(): WAsyncThrowableType<pg.QueryResult> {
    this.subscribedChannels.clear();
    return this.dbClient.query(`UNLISTEN *`);
  }

  /**
   * Initializes notifications forwarding to our listeners and listen for errors from dbClient
   */
  private initialize(): WNothingType {
    // Wire the DB client events to our exposed emitter's events
    this.cancelEventForwarding = wPgListenerCreator(
      this.dbClient,
      this.emitter,
      this.options.parse
    );

    this.dbClient.on('error', this.onDBClientErrorHandler.bind(this));
    this.dbClient.on('end', this.onDBClientErrorHandler.bind(this));

    if (this.options.paranoidChecking) {
      this.paranoidCheckCanceler = wPgListenParanoidCheckScheduler(
        this.dbClient,
        this.options.paranoidChecking,
        this.reinitialize.bind(this)
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
      this.paranoidCheckCanceler();
      this.cancelEventForwarding();

      this.dbClient.removeAllListeners();
      await this.dbClient.end();

      this.dbClient = await wPgListenReconnecter(
        this.connectionConfig,
        this.options,
        (attempt: number): boolean => this.emitter.emit('reconnect', attempt)
      );

      this.initialize();

      const subscribedChannelsArray: ReadonlyArray<string> = Array.from(this.subscribedChannels);

      await Promise.all(
        subscribedChannelsArray.map<Promise<WNothingType>>(
          (channelName: string) => this.dbClient
            .query(`LISTEN ${pgFormat.ident(channelName)}`)
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
    const ClientConstructor: typeof pg.Client = this.options.native && pg.native ? pg.native.Client : pg.Client;

    return new ClientConstructor(effectiveConnectionConfig);
  }
}
