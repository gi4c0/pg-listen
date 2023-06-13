import { WAsyncThrowableType, WNothingType } from '@w-utility';
import * as pg from 'pg';

export type WPgSubscriberInterface<Events extends Record<string, any> = { [channel: string]: any }> = Readonly<{
  /** Don't forget to call this asynchronous method before doing your thing */
  connect(): Promise<void>;
  close(): Promise<void>;
  getSubscribedChannels(): ReadonlyArray<string>;
  listenTo(channelName: string): WAsyncThrowableType<WNothingType>;

  notify<EventName extends keyof Events>(
    channelName: any extends Events[EventName] ? EventName : void extends Events[EventName] ? never : EventName,
    payload: Events[EventName] extends void ? never : Events[EventName]
  ): Promise<pg.QueryResult>;

  notify<EventName extends keyof Events>(
    channelName: void extends Events[EventName] ? EventName : never
  ): Promise<pg.QueryResult>;

  unlisten(channelName: string): Promise<pg.QueryResult> | undefined;
  unlistenAll(): Promise<pg.QueryResult>;
}>;
