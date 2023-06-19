import { WAsyncThrowableType } from '@w/utility';
import * as pg from 'pg';

export type WPgReconnectFunctionType = (onAttempt: (attempt: number) => void) => WAsyncThrowableType<pg.Client>;
