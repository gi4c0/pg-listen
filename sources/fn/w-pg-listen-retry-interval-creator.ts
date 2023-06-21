import { WPgOptionsType } from '../type';

export function wPgListenRetryIntervalCreator(options: Required<WPgOptionsType>, attempt: number): number {
  return (
    typeof options.retryInterval === 'function'
      ? options.retryInterval
      : () => options.retryInterval
  )(attempt) as number;
}
