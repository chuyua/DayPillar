export interface BeastIntro { readonly name: string; readonly chapter: string; readonly description: string; readonly source: string; }
export declare const HEXAGRAM_SOURCE: string;
export declare function lookupHexagramIntro(name: string): string | null;
export declare function hexagramIntroNames(): string[];
export declare function lookupShanhaiBeast(name: string): BeastIntro | null;
export declare function shanhaiBeasts(): readonly BeastIntro[];
