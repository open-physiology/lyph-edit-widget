import isFinite  from 'lodash/isFinite';
import ldIsEqual from 'lodash/isEqual';

//noinspection JSFileReferences
import Fraction from 'fraction.js';
export default Fraction;

export function isNumber(v) {
	return isFinite(v) || v instanceof Fraction;
}

export function equals(a, b) {
	if (a instanceof Fraction) { return a.equals(b) }
	if (b instanceof Fraction) { return b.equals(a) }
	return ldIsEqual(a, b);
}

export function sum(values) {
	return values.reduce((accumulation, next) => accumulation.add(next), Fraction(0));
}
