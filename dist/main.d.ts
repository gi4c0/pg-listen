/// <reference types="node" />
import * as pg from 'pg';
import { EventEmitter } from 'events';
import { WPgOptionsType } from './types';
import TypedEventEmitter from 'typed-emitter';
import { WPgListenEventsType } from './types/pg/w-pg-listen-events.type';
import { WAsyncThrowableType, WNothingType } from '@w-utility';
export declare class WPgListener {
    private dbClient;
    private subscribedChannels;
    private isClosing;
    private isReinitializing;
    private connectionConfig;
    private options;
    private emitter;
    private notificationsEmitter;
    private cancelEventForwarding;
    private cancelParanoidChecking;
    constructor(connectionConfig?: pg.ClientConfig, options?: Partial<WPgOptionsType>);
    get events(): TypedEventEmitter<WPgListenEventsType>;
    get notifications(): EventEmitter;
    connect(): WAsyncThrowableType<WNothingType>;
    close(): WAsyncThrowableType<WNothingType>;
    getSubscribedChannels(): ReadonlyArray<string>;
    listenTo(channelName: string): WAsyncThrowableType<WNothingType>;
    notify(channelName: string, payload?: any): Promise<pg.QueryResult>;
    unlisten(channelName: string): WAsyncThrowableType<WNothingType>;
    unlistenAll(): WAsyncThrowableType<pg.QueryResult>;
    private initialize;
    private reinitialize;
    private createClient;
}
