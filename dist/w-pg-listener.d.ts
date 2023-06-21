/// <reference types="node" />
import * as pg from 'pg';
import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { WAsyncThrowableType, WNothingType } from '@w/utility';
import { WPgListenEventsType, WPgOptionsType } from './type';
export declare class WPgListener {
    private static createOptions;
    private dbClient;
    private readonly subscribedChannels;
    private isClosing;
    private isReinitializing;
    private readonly connectionConfig;
    private readonly options;
    private readonly emitter;
    private readonly notificationsEmitter;
    private cancelEventForwarding;
    private paranoidCheckCanceler;
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
    private onDBClientErrorHandler;
    private reinitialize;
    private createClient;
}
