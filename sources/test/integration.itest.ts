import { wNothing } from '@w-utility';

// Need to require `pg` like this to avoid ugly error message
import * as pg from 'pg';
import { WPgListener, WPgNotificationType } from '..';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const connectionString: string = 'postgres://alexpan:123@localhost:5432/postgres';

describe(
  'PgListener',
  (): void => {
    it(
      'Should connect',
      async () => {
        const hub: WPgListener = new WPgListener({ connectionString });
        await hub.connect();
        await hub.close();
      },
      60000
    );

    it(
      'Should listen and notify',
      async (): Promise<void> => {
        let connectedEvents: number = 0;
        const notifications: Array<WPgNotificationType> = new Array<WPgNotificationType>;
        const receivedPayloads: Array<any> = [];

        const hub: WPgListener = new WPgListener({ connectionString });

        hub.events.on('connected', () => connectedEvents++);
        hub.events.on('notification', (notification: WPgNotificationType) => notifications.push(notification));
        hub.notifications.on('test', (payload: any) => receivedPayloads.push(payload));

        await hub.connect();

        try {
          await hub.listenTo('test');

          await hub.notify('test', { hello: 'world' });
          await hub.notify('test2', 'should not be received, since not subscribed to channel test2');
          await delay(200);

          expect<ReadonlyArray<string>>(hub.getSubscribedChannels()).toEqual(['test']);
          expect<ReadonlyArray<WPgNotificationType>>(notifications).toEqual(new Array<WPgNotificationType>({
            channel: 'test',
            payload: { hello: 'world' },
            processId: notifications[0].processId
          }));

          expect<ReadonlyArray<any>>(receivedPayloads).toEqual(new Array<any>({ hello: 'world' }));
          expect<number>(connectedEvents).toBe(1);
        } finally {
          await hub.close();
        }
      },
      60000
    );

    it(
      'Should handle notification without payload',
      async (): Promise<void> => {
        const notifications: Array<WPgNotificationType> = new Array<WPgNotificationType>();
        const receivedPayloads: Array<any> = new Array<any>();

        const hub: WPgListener = new WPgListener({ connectionString });
        await hub.connect();

        try {
          await hub.listenTo('test');

          hub.events.on('notification', (notification: WPgNotificationType) => notifications.push(notification));
          hub.notifications.on('test', (payload: any) => receivedPayloads.push(payload));

          await hub.notify('test');
          await delay(200);

          expect<ReadonlyArray<string>>(hub.getSubscribedChannels()).toEqual(['test']);
          expect(notifications).toEqual(new Array<WPgNotificationType>({
            channel: 'test',
            payload: undefined,
            processId: notifications[0].processId
          }));

          expect<Array<any>>(receivedPayloads).toEqual(new Array<any>(wNothing));
        } finally {
          await hub.close();
        }
      },
      60000
    );

    it(
      'Should use custom `parse` function',
      async (): Promise<void> => {
        const notifications: Array<WPgNotificationType> = new Array<WPgNotificationType>();

        const hub: WPgListener = new WPgListener(
          { connectionString },
          { parse: (base64: string) => Buffer.from(base64, 'base64').toString('utf8') }
        );

        await hub.connect();

        const client: pg.Client = new pg.Client({ connectionString });
        await client.connect();

        try {
          await hub.listenTo('test');
          hub.events.on('notification', (notification: WPgNotificationType) => notifications.push(notification));

          await client.query(`NOTIFY test, '${Buffer.from('I am a payload.', 'utf8').toString('base64')}'`);
          await delay(200);

          expect<ReadonlyArray<WPgNotificationType<any>>>(notifications).toEqual(new Array<WPgNotificationType<string>>({
            channel: 'test',
            payload: 'I am a payload.',
            processId: notifications[0].processId
          }));
        } finally {
          await hub.close();
          await client.end();
        }
      },
      60000
    );

    it(
      'Should get notification after connection is terminated',
      async (): Promise<void> => {
        let connectedEvents: number = 0;
        let reconnects: number = 0;

        const notifications: Array<WPgNotificationType> = new Array<WPgNotificationType>();
        const receivedPayloads: Array<any> = new Array<any>();

        let client: pg.Client = new pg.Client({ connectionString });
        await client.connect();

        const hub: WPgListener = new WPgListener(
          { connectionString: connectionString + '?ApplicationName=pg-listen-termination-test' },
          { paranoidChecking: 1000 }
        );

        hub.events.on('connected', () => connectedEvents++);
        hub.events.on('notification', (notification: WPgNotificationType) => notifications.push(notification));
        hub.events.on('reconnect', () => reconnects++);
        hub.notifications.on('test', (payload: any) => receivedPayloads.push(payload));

        await hub.connect();

        try {
          await hub.listenTo('test');
          await delay(1000);

          // Don't await as we kill some other connection, so the promise won't resolve (I think)
          await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND usename = current_user');
          await client.end();
          await delay(2000);

          client = new pg.Client({ connectionString });
          await client.connect();

          await client.query(`NOTIFY test, '{"hello": "world"}';`);
          await delay(500);

          expect<ReadonlyArray<string>>(hub.getSubscribedChannels()).toEqual(new Array<string>('test'));
          expect<ReadonlyArray<WPgNotificationType<any>>>(notifications).toEqual(new Array<WPgNotificationType>({
            channel: 'test',
            payload: { hello: 'world' },
            processId: notifications[0] ? notifications[0].processId : 0
          }));

          expect<ReadonlyArray<any>>(receivedPayloads).toEqual(new Array<any>({ hello: 'world' }));
          expect<number>(reconnects).toBe(1);
          expect<number>(connectedEvents).toBe(2);
        } finally {
          await hub.close();
          await client.end();
        }
      },
      6000000
    );
  }
);

