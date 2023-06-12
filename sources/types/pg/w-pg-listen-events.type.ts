import { WPgNotificationType } from './w-pg-notification.type';

export type WPgListenEventsType = Readonly<{
  connected: () => void,
  error: (error: Error) => void,
  notification: (notification: WPgNotificationType) => void,
  reconnect: (attempt: number) => void
}>;
