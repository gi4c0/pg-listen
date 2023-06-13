import { WPgOptionsType } from '../pg';

export type WPgApiOptionsType = Omit<WPgOptionsType, 'serialize' | 'parse'>
