export interface TraditionalAlmanac {
  readonly monthBranch: string;
  readonly monthNumber: number;
  readonly dayBranch: string;
  readonly monthYan: string;
  readonly yanDui: string;
  readonly hitMonthYan: boolean;
  readonly hitYanDui: boolean;
  readonly twelveStar: string;
  readonly ecliptic: '黄道' | '黑道';
  readonly tianGang: string;
  readonly heKui: string;
  readonly hitTianGang: boolean;
  readonly hitHeKui: boolean;
  readonly generalName: string;
  readonly generalBranch: string;
  readonly generalBoundary: string;
}
export declare function deriveTraditionalAlmanac(
  monthCycle: string, dayCycle: string, recentSolarTerm: string
): TraditionalAlmanac | null;
