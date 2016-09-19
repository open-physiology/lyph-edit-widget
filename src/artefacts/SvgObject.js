import defer from 'promise-defer';

import pick from 'lodash-bound/pick';
import keys from 'lodash-bound/keys';
import defaults from 'lodash-bound/defaults';
import isFunction from 'lodash-bound/isFunction';
import isUndefined from 'lodash-bound/isUndefined';

import {values, defineProperty} from 'bound-native-methods';

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
const $$placeholder     = Symbol('$$placeholder');
const $$partKeys        = Symbol('$$partKeys');


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
	}
	
	[$$create]() {
		if (!this[$$creation]) {
			const CYCLE_MSG = humanMsg`
				This element is in the process of being created.
			`;
			assert(!this[$$creatingElement], CYCLE_MSG);
			this[$$creatingElement] = true;
			
			/* prepare environment for during element creation */
			this[$$elementCreated] = defer();
			this[$$creation] = {};
			for (let [key] of this.constructor.getPartDescriptions()) {
				this[$$creation][key] = {
					promise: this[$$elementCreated].promise.then(() => this[$$creation][key]),
					get jq()  { assert(false, CYCLE_MSG) },
					get svg() { assert(false, CYCLE_MSG) }
				};
			}
			
			/* create element */
			let createdElement = this.createElement();
			
			/* prepare all (sub)element references */
			for (let [key, def] of this.constructor.getPartDescriptions()) {
				let el = this[$$creation][key] = createdElement[key] || this::def();
				el::defaults({
					jq:      $(el),
					svg:     Snap(el),
					promise: this[$$elementCreated].promise.then(() => el)
				});
				if (el) { el.svg.addClass(key) }
			}
			
			/* annotate the main element as being controlled by this object */
			$(this[$$creation].element).attr('controller', ''+this); // for css-selectors
			window[$$elementCtrl].set(this[$$creation].element, this);
			
			/* stop creating; resolve promise */
			this[$$creatingElement] = false;
			this[$$elementCreated].resolve(this[$$creation].element);

			/* run afterCreateElement method, which can be overridden */
			// TODO: replace these with references to the promise
			if (this.afterCreateElement::isFunction()) {
				this.afterCreateElement();
			}
		}
		return this[$$creation];
	}
	
	async afterCreateElement() {
		/* wait until next tick */
		await this.element.promise;
		
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
	
	@args('oa?o?') setFromObject(obj, picked = [], defaultValues = {}) {
		let keyVals = obj
			::pick([...picked, ...defaultValues::keys()])
			::defaults(defaultValues);
		this::assign(keyVals);
	}
	
	moveToFront({ onlyFreeArtefacts = true } = {}) {
		for (let element = this.element; element !== this.root.inside; element = element.parentElement) {
			const fixed = element.classList.contains('fixed');
			const artefact = window[$$elementCtrl].get(element);
			// debugger;
			if (!fixed && (!onlyFreeArtefacts || !artefact || artefact.free)) {
				element.parentElement.appendChild(element);
			}
		}
		// this.element.parentElement.appendChild(this.element); // TODO: remove
	}
	
	static definePartGetter(key, def = ()=>{}) {
		this.prototype::defineProperty(key, {
			get() { return this[$$create]()[key] }
		});
		if (!this[$$partKeys]) { this[$$partKeys] = new Map() }
		this[$$partKeys].set(key, def);
	}
	
	static getPartDescriptions() {
		let result = new Map();
		for (let cls = this; cls !== SvgObject.__proto__; cls = cls.__proto__) {
			for (let [key, def] of cls[$$partKeys] || []) {
				result.set(key, def);
			}
		}
		return result;
	}
	
}

/* prepare element getters */
for (let [key, def] of [
	['element',    function () { assert(false)                               }],
	['inside',     function () { return this[$$creation].element             }],
	['handle',     function () { return this[$$creation].element             }],
	['foreground', function () { return this[$$creation].inside.svg.g().node }]
]) { SvgObject.definePartGetter(key, def) }
