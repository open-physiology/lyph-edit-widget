import pick from 'lodash-bound/pick';
import keys from 'lodash-bound/keys';
import defaults from 'lodash-bound/defaults';
import isFunction from 'lodash-bound/isFunction';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';

import $ from '../libs/jquery';

import assert from 'power-assert';

import ValueTracker, {property} from '../util/ValueTracker.js';

import {humanMsg} from '../util/misc';
import {args} from "../util/misc";

import {assign} from 'bound-native-methods';
import {flag} from "../util/ValueTracker";

const $$svg             = Symbol('$$svg');
const $$creatingElement = Symbol('$$creatingElement');
const $$create          = Symbol('$$create');
const $$creation        = Symbol('$$creation');


export default class SvgObject extends ValueTracker {
	
	@flag(false) highlighted;
	@flag(false) dragging;
	
	toString() {
		return `[${this.constructor.name}: ${this.model && this.model.name}]`;
	}
	
	constructor(options) {
		super(options);
		this.setFromObject(options, ['free', 'highlighted', 'dragging']);
	}
	
	[$$create]() {
		if (!this[$$creation]) {
			assert(!this[$$creatingElement], humanMsg`
				This element is already being created. Do not
				use 'this.element' during the creation process.
			`);
			this[$$creatingElement] = true;
			
			this[$$creation] = this.createElement();
			
			let el = this[$$creation].element;
			el::defaults({ jq: $(el), svg: Snap(el) });
			if (!this[$$creation].inside) {
				this[$$creation].inside = this[$$creation].element;
			} else {
				let el = this[$$creation].inside;
				el::defaults({ jq: $(el), svg: Snap(el) });
			}
			
			this[$$creation].inside.svg.g().addClass('foreground');
			$(this[$$creation].inside).data('controller', this);
			$(this[$$creation].inside).attr('controller', this.constructor.name + ':' + (this.model ? this.model.name : '')); // for css-selectors
			
			this[$$creatingElement] = false;

			if (this.afterCreateElement::isFunction()) {
				this.afterCreateElement();
			}
		}
		return this[$$creation];
	}
	
	afterCreateElement() {
		/* manage 'dragging' property */
		this.p('dragging').subscribe((dragging) => {
			this.element.jq.css(dragging
				? { pointerEvents: 'none', opacity: 0.8 }
				: { pointerEvents: 'auto', opacity: 1   });
			// this.element.jq.css(dragging
			// 	? { pointerEvents: 'none',    opacity: 0.8 }
			// 	: { pointerEvents: 'inherit', opacity: 1   });
		});
	}
	
	get element() { return this[$$create]().element }
	get inside () { return this[$$create]().inside  }
	
	@args('oa?o?') setFromObject(obj, picked = [], defaultValues = {}) {
		let keyVals = obj
			::pick([...picked, ...defaultValues::keys()])
			::defaults(defaultValues);
		this::assign(keyVals);
	}
	
	moveToFront() {
		this.element.parentElement.appendChild(this.element);
	}
	
	get draggable() { return false }
	
}
































// export default class SvgObject extends ValueTracker {
//
// 	// properties //////////////////////////////////////////////////////////////////////////////////
//
// 	// @property({initial: false}) dragging;
// 	// @property({initial: false}) resizing;
// 	// @property({initial: false}) hovering;
// 	//
// 	// interactive = true;
//
//
// 	// public //////////////////////////////////////////////////////////////////////////////////////
//
// 	constructor(options) {
// 		super(options);
// 		Object.assign(this, options::pick('interactive'));
// 	}
//
// 	get element() {
// 		if (!this._element) {
// 			if (this.creatingElement) {
// 				throw new Error(`This element is already being created. Do not use 'this.element' during the creation process.`);
// 			}
// 			this.creatingElement = true;
// 			this._element = this.createElement();
// 			delete this.creatingElement;
// 			this._element.data('controller', this);
// 			this._element.attr('controller', true);
// 			// if (this.interactive === false) {
// 			this._element.css({ pointerEvents: 'none' });
// 			// } else {
// 			// 	this._makeInteractable(this._element);
// 			// }
// 			this.e('delete').subscribe(::this._element.remove);
// 		}
// 		return this._element;
// 	};
//
// 	// private /////////////////////////////////////////////////////////////////////////////////////
//
// 	// _makeInteractable(mainElement) {
// 	// 	if (this.draggable) {
// 	// 		let {handle, tracker, ...draggableOptions} = this.draggable();
// 	// 		if (!handle)  { handle = mainElement                }
// 	// 		else          { handle = mainElement.find(handle)   }
// 	// 		if (!tracker) { tracker = handle                    }
// 	// 		else          { tracker = mainElement.find(tracker) }
// 	// 		interact(tracker[0]).draggable({
// 	// 			...draggableOptions,
// 	// 			onstart: (event) => {
// 	// 				event.stopPropagation();
// 	// 				this.dragging = true;
// 	// 				(draggableOptions.onstart || identity)(event);
// 	// 			},
// 	// 			onend: (event) => {
// 	// 				event.stopPropagation();
// 	// 				(draggableOptions.onend || identity)(event);
// 	// 				this.dragging = false;
// 	// 			}
// 	// 		});
// 	// 	}
// 	// 	if (this.resizable) {
// 	// 		let {handle, tracker, ...resizableOptions} = this.resizable();
// 	// 		if (!handle)  { handle = mainElement                }
// 	// 		else          { handle = mainElement.find(handle)   }
// 	// 		if (!tracker) { tracker = handle                    }
// 	// 		else          { tracker = mainElement.find(tracker) }
// 	// 		interact(handle[0]).resizable({
// 	// 			...resizableOptions,
// 	// 			onstart: (event) => {
// 	// 				event.stopPropagation();
// 	// 				this.resizing = true;
// 	// 				(resizableOptions.onstart || identity)(event);
// 	// 			},
// 	// 			onend: (event) => {
// 	// 				event.stopPropagation();
// 	// 				(resizableOptions.onend || identity)(event);
// 	// 				this.resizing = false;
// 	// 			}
// 	// 		});
// 	// 		interact(tracker[0]).rectChecker(e => e.getBoundingClientRect());
// 	// 	}
// 	// 	if (this.dropzone) {
// 	// 		let {handle, ...dropzoneOptions} = this.dropzone();
// 	// 		if (!handle)  { handle = mainElement                }
// 	// 		else          { handle = mainElement.find(handle)   }
// 	// 		interact(handle[0]).dropzone(dropzoneOptions);
// 	// 	}
// 	// };
//
// }
