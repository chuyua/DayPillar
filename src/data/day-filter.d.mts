export interface SearchableDay {
  iso: string; dayCycle: string; duty: string; star27: string;
  lunarName: string; lunarMonthName: string;
  term: string | null; festival: string | null;
}
export declare function matchesDay(day: SearchableDay, keyword: string): boolean;
