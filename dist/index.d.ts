import TypedEventEmitter from "typed-emitter";
import pg = require("pg");
export interface PgParsedNotification {
    processId: number;
    channel: string;
    payload?: any;
}
interface PgListenEvents {
    connected: () => void;
    error: (error: Error) => void;
    notification: (notification: PgParsedNotification) => void;
    reconnect: (attempt: number) => void;
}
type EventsToEmitterHandlers<Events extends Record<string, any>> = {
    [channelName in keyof Events]: (payload: Events[channelName]) => void;
};
export interface Options {
    native?: boolean;
    paranoidChecking?: number | false;
    retryInterval?: number | ((attempt: number) => number);
    retryLimit?: number;
    retryTimeout?: number;
    parse?: (serialized: string) => any;
    serialize?: (data: any) => string;
}
export interface Subscriber<Events extends Record<string, any> = {
    [channel: string]: any;
}> {
    events: TypedEventEmitter<PgListenEvents>;
    notifications: TypedEventEmitter<EventsToEmitterHandlers<Events>>;
    connect(): Promise<void>;
    close(): Promise<void>;
    getSubscribedChannels(): string[];
    listenTo(channelName: string): Promise<pg.QueryResult> | undefined;
    notify<EventName extends keyof Events>(channelName: any extends Events[EventName] ? EventName : void extends Events[EventName] ? never : EventName, payload: Events[EventName] extends void ? never : Events[EventName]): Promise<pg.QueryResult>;
    notify<EventName extends keyof Events>(channelName: void extends Events[EventName] ? EventName : never): Promise<pg.QueryResult>;
    unlisten(channelName: string): Promise<pg.QueryResult> | undefined;
    unlistenAll(): Promise<pg.QueryResult>;
}
declare function createPostgresSubscriber<Events extends Record<string, any> = {
    [channel: string]: any;
}>(connectionConfig?: pg.ClientConfig, options?: Options): Subscriber<Events>;
export default createPostgresSubscriber;
