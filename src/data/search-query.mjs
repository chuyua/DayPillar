import {Duty,LunarDay,LunarMonth,LunarFestival,SolarFestival,SolarTerm} from 'tyme4ts';
import {guaEntries} from './gua-ying.mjs';
import {TRADITIONAL_STARS} from './stars.mjs';

// Only a vocabulary check: actual dates and matches still come from tyme4ts.
// Use upstream names, including leap-month variants, rather than copying rules.
const names=[
  ...Duty.NAMES,...LunarDay.NAMES,...SolarTerm.NAMES,
  ...SolarFestival.NAMES,...LunarFestival.NAMES,
  ...LunarMonth.NAMES.flatMap(name=>[name,name+'月','闰'+name,'闰'+name+'月']),
  ...TRADITIONAL_STARS.map(name=>name+'宿'),
  ...guaEntries().flatMap(entry=>[entry.dayCycle,entry.gua,entry.ying])
].map(name=>name.toLocaleLowerCase());

export function canMatchQuery(raw) {
  return String(raw ?? '').trim().toLocaleLowerCase().split(/\s+/).every(part=>
    !part || /^[\d-]+$/.test(part) || names.some(name=>name.includes(part)));
}
