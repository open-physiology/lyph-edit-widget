import defer from 'promise-defer';

import pick from 'lodash-bound/pick';
import keys from 'lodash-bound/keys';
import defaults from 'lodash-bound/defaults';
import isFunction from 'lodash-bound/isFunction';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _defer from 'lodash/defer';

import $ from '../libs/jquery';

import assert from 'power-assert';

import ValueTracker, {property} from '../util/ValueTracker.js';

import {humanMsg} from '../util/misc';
import {args} from "../util/misc";

import {assign} from 'bound-native-methods';
import {flag} from "../util/ValueTracker";
import {$$elementCtrl} from "../symbols";

const $$svg             = Symbol('$$svg');
const $$creatingElement = Symbol('$$creatingElement');
const $$create          = Symbol('$$create');
const $$creation        = Symbol('$$creation');
const $$elementCreated  = Symbol('$$elementCreated');



window[$$elementCtrl] = new WeakMap();



export default class SvgObject extends ValueTracker {
	
	@flag(false) selected;
	@flag(false) dragging;
	@flag(false) hidden;
	
	@flag(false) free;
	@flag(false) draggable;
	// @flag(false) resizable;
	
	toString() { return `[${this.constructor.name}]` }

	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'free',
			'selected',
			'dragging'
		]);
		this[$$elementCreated] = defer();
	}
	
	get elementCreated() { return this[$$elementCreated].promise.then(() => this.element) }
	get insideCreated()  { return this[$$elementCreated].promise.then(() => this.inside ) }
	get handleCreated()  { return this[$$elementCreated].promise.then(() => this.handle ) }
	
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
			if (!this[$$creation].handle) {
				this[$$creation].handle = this[$$creation].element;
			} else {
				let el = this[$$creation].handle;
				el::defaults({ jq: $(el), svg: Snap(el) });
			}
			
			this[$$creation].inside.svg.g().addClass('foreground');
			$(this[$$creation].element).attr('controller', ''+this); // for css-selectors
			window[$$elementCtrl].set(this[$$creation].element, this);
			
			this[$$creatingElement] = false;
			this[$$elementCreated].resolve(this[$$creation].element);

			if (this.afterCreateElement::isFunction()) {
				this.afterCreateElement();
			}
		}
		return this[$$creation];
	}
	
	async afterCreateElement() {
		/* wait until next tick */
		await this.elementCreated;
		
		/* manage 'dragging' property */
		this.p(['hidden', 'dragging']).subscribe(([hidden, dragging]) => {
			this.element.jq.css(
				hidden
				? { pointerEvents: 'none', opacity: 0   }
				: dragging
				? { pointerEvents: 'none', opacity: 0.8 }
				: { pointerEvents: '',     opacity: 1   });
		});
	}
	
	get element() { return this[$$create]().element }
	get inside () { return this[$$create]().inside  }
	get handle () { return this[$$create]().handle  }
	
	@args('oa?o?') setFromObject(obj, picked = [], defaultValues = {}) {
		let keyVals = obj
			::pick([...picked, ...defaultValues::keys()])
			::defaults(defaultValues);
		this::assign(keyVals);
	}
	
	moveToFront() {
		this.element.parentElement.appendChild(this.element);
	}
	
}
