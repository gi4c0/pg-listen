export type WPgNotificationType<T = object> = Readonly<{
  processId: number;
  channel: string;
  payload?: T;
}>;
