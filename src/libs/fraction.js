import isFinite  from 'lodash/isFinite';
import ldIsEqual from 'lodash/isEqual';

//noinspection JSFileReferences
import Fraction from 'fraction.js';
export default Fraction;

export function isNumber(v) {
	return isFinite(v) || v instanceof Fraction;
}

export function equals(a, b) {
	// if (a instanceof Fraction && a.n === 0 && b instanceof Fraction && b.n === 0) { return true } // TODO: is this a strange bug of Fraction.js?
	// if (a instanceof Fraction && b instanceof Fraction) {
	// 	console.log(a.n, '/', a.d, '===', b.n, '/', b.d, '???', a.equals(b));
	// }
	if (a instanceof Fraction) { return a.equals(b) }
	if (b instanceof Fraction) { return b.equals(a) }
	return ldIsEqual(a, b);
}

export function sum(values) {
	return values.reduce((accumulation, next) => accumulation.add(next), Fraction(0));
}
