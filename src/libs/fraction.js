import {isFinite}            from 'lodash-bound';
import {isEqual as _isEqual} from 'lodash';

//noinspection JSFileReferences
import Fraction from 'fraction.js';
export default Fraction;

export function isNumber(v) {
	return v::isFinite() || v instanceof Fraction;
}

export function equals(a, b) {
	if (a instanceof Fraction) { return a.equals(b) }
	if (b instanceof Fraction) { return b.equals(a) }
	return _isEqual(a, b);
}

export function sum(values) {
	return values.reduce((accumulation, next) => accumulation.add(next), Fraction(0));
}
