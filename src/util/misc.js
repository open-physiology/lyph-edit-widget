import {isFinite as _isFinite} from 'lodash';

export const _isNonNegative = (v) =>
	(_isFinite(v) && v >= 0);
