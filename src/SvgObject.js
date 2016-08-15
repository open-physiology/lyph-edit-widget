import pick from 'lodash-bound/pick';
import keys from 'lodash-bound/keys';
import defaults from 'lodash-bound/defaults';

import $ from './libs/jquery';

import assert from 'power-assert';

import ValueTracker, {property} from './util/ValueTracker.js';

import {humanMsg} from './util/misc';
import {args} from "./util/misc";

import {assign} from 'bound-native-methods';

const $$svg             = Symbol('$$svg');
const $$creatingElement = Symbol('$$creatingElement');
const $$create          = Symbol('$$create');
const $$creation        = Symbol('$$creation');


export default class SvgObject extends ValueTracker {
	
	constructor(options) {
		super(options);
		this.setFromObject(options, ['interactive']);
	}
	
	[$$create]() {
		if (!this[$$creation]) {
			assert(!this[$$creatingElement], humanMsg`
				This element is already being created. Do not
				use 'this.element' during the creation process.
			`);
			this[$$creatingElement] = true;
			this[$$creation] = this.createElement();
			delete this[$$creatingElement];
			$(this.element).data('controller', this);
			$(this.element).attr('controller', true); // for css-selectors
		}
		return this[$$creation];
	}
	
	get svg    () { return this[$$create]().svg      }
	get element() { return this[$$create]().svg.node }
	
	@args('oa?o?') setFromObject(obj, picked = [], defaultValues = {}) {
		let keyVals = obj
			::pick([...picked, ...defaultValues::keys()])
			::defaults(defaultValues);
		this::assign(keyVals);
	}
	
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
