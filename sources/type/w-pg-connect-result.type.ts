import * as pg from 'pg';
import { WPgListenReconnectFnType } from './w-pg-listen-reconnect-fn.type';

export type WPgConnectResultType = Readonly<{
  /**
   * PG Client
   */
  dbClient: pg.Client;

  /**
   * Reconnect function
   */
  reconnect: WPgListenReconnectFnType;
}>;
