export declare const GUA_YING: ReadonlyArray<string>;
export interface GuaEntry {
  readonly index: number;
  readonly dayCycle: string;
  readonly gua: string;
  readonly ying: string;
  readonly raw: string;
}
export declare const DAY_CYCLES: ReadonlyArray<string>;
export declare function guaEntries(): ReadonlyArray<GuaEntry>;
export declare function lookupDayGua(dayCycle: string): GuaEntry | null;
