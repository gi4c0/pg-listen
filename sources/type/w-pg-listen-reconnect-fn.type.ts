import * as pg from 'pg';
import { WAsyncThrowableType } from '@w/utility';

export type WPgListenReconnectFnType = (onAttempt: (attempt: number) => void) => WAsyncThrowableType<pg.Client>;
