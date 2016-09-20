import $ from 'jquery';
export default $;

import 'jquery-mousewheel';
// jqMousewheel($);

/* powertip plugin */
import '../../node_modules/jquery-powertip/dist/jquery.powertip.js';
import '../../node_modules/jquery-powertip/dist/css/jquery.powertip.min.css';
import '../../node_modules/jquery-powertip/dist/css/jquery.powertip-dark.min.css';

/* convenience static methods */
Object.assign($, {
	svg(creationString) {
		return this(`<svg>${creationString}</svg>`).children().detach();
	}
});

/* convenience instance methods */
import isUndefined from 'lodash-bound/isUndefined';
const associations = new WeakMap; // element -> key -> value
Object.assign($.fn, {
	getBoundingClientRect() {
		return this[0].getBoundingClientRect();
	},
	association(key, value) {
		const element = this[0];
		if (value::isUndefined()) {
			return associations.get(element) && associations.get(element)[key];
		} else {
			if (!associations.has(element)) { associations.set(element, {}) }
			associations.get(element)[key] = value;
			return this;
		}
	}
});

/* fix strange bug where case-sensitive attribute name is not used properly */
$.attrHooks['viewbox'] = {
	set: function(elem, value, name) {
		elem.setAttributeNS(null, 'viewBox', value + '');
		return value;
	}
};
