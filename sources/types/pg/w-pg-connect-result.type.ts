import * as pg from 'pg';
import { WPgReconnectFunctionType } from './w-pg-reconnect-function.type';

export type WPgConnectResultType = Readonly<{
  /**
   * PG Client
   */
  dbClient: pg.Client;

  /**
   * Reconnect function
   */
  reconnect: WPgReconnectFunctionType;
}>;
