// 传统农历月日二十七宿循环口径，不包含牛宿。
// 只发布可公开的规则；机构内部 XLSX 原件、完整表格及文件指纹均不进入仓库。
export const TRADITIONAL_STARS = Object.freeze('角亢氐房心尾箕斗女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸'.split(''));
export const MONTH_STARTS = Object.freeze(['室', '奎', '胃', '毕', '参', '鬼', '张', '角', '氐', '心', '斗', '虚']);
const firstIndices = MONTH_STARTS.map(name => TRADITIONAL_STARS.indexOf(name));
if (new Set(TRADITIONAL_STARS).size !== 27 || firstIndices.some(i => i < 0)) {
  throw new Error('二十七宿公开规则配置错误');
}

/** @param {number} monthSigned 农历月（闰月为负，暂按同名月份计算） @param {number} day 农历日 */
export function lookupTraditionalStar(monthSigned, day) {
  if (!Number.isInteger(monthSigned) || !Number.isInteger(day)) {
    throw new RangeError('农历月份和日期必须为整数');
  }
  const month = Math.abs(monthSigned);
  if (month < 1 || month > 12 || day < 1 || day > 30) {
    throw new RangeError(`超出农历查表范围: ${monthSigned}月${day}日`);
  }
  return TRADITIONAL_STARS[(firstIndices[month - 1] + day - 1) % 27] + '宿';
}
