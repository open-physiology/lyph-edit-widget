import pick from 'lodash-bound/pick';

import assert from 'power-assert';

import {property} from '../util/ValueTracker.js';

import {switchMap}  from 'rxjs/operator/switchMap';
import {partition} from 'rxjs/operator/partition';
import {merge}     from 'rxjs/observable/merge';
import {map} from 'rxjs/operator/map';
import {of} from 'rxjs/observable/of';
import {filter} from 'rxjs/operator/filter';
import {startWith} from 'rxjs/operator/startWith';
import {pairwise} from 'rxjs/operator/pairwise';
import {takeUntil} from 'rxjs/operator/takeUntil';

import isFunction from 'lodash-bound/isFunction';

import SvgObject from './SvgObject.js';
import ObservableSet from "../util/ObservableSet";
import {subscribe_} from "../util/rxjs";


export default class SvgEntity extends SvgObject {

	@property() model;
	@property() root;
	@property() parent;
	children = new ObservableSet();
	
	toString() {
		return `[${this.constructor.name}: ${this.model && this.model.name}]`;
	}

	constructor(options) {
		super(options);
		
		/* process options */
		this.setFromObject(options, ['model', 'parent']);
		
		/* maintain the root of this entity */
		this.p('parent')
			::switchMap(e => e ? e.p('root') : of(this))
			::subscribe_( this.p('root') , n=>n() );
		
		/* maintain this entity as a child of its parent */
		this.p('parent')::startWith(null)::pairwise()
			.subscribe(([prev, curr]) => {
				if (prev) { prev.children.delete(this) }
				if (curr) { curr.children.add   (this) }
			});
		
		/* maintain this entity as a parent of its children */
		this.children.e('add')                               .subscribe(e => { e.parent = this });
		this.children.e('delete')::filter(e=>e.parent===this).subscribe(e => { e.parent = null });
		
		/* when a parent is dragging, its children are dragging */
		this.p('parent.dragging')
			// ::switchMap(parent => parent ? parent.p('dragging') : of(true))
			::subscribe_( this.p('dragging') , n=>n() );
		
	}
	
	findAncestor(other) {
		let pred = other::isFunction() ? other : (o => o === other);
		if (pred(this)) { return this }
		return this.parent && this.parent.findAncestor(pred);
	}
	
	*traverse(order = 'pre') {
		if (order === 'pre') {
			yield this;
		}
		for (let child of this.children) {
			yield* child.traverse();
		}
		if (order !== 'pre') {
			yield this;
		}
	}
	
}


















// export default class SvgEntity extends SvgObject {
//
// 	model;
// 	root;
// 	parent;
// 	children = new Set();
//
// 	constructor(options) {
// 		super(options);
// 		Object.assign(this, options::pick('model'));
//
// 		// this.setParent(options.parent);
// 		// this.root.p('draggingSomething').plug(this.p('dragging'));
// 		// this.root.p('resizingSomething').plug(this.p('resizing'));
//
// 		// if (this.parent && this.parent.interactive === false) { this.interactive = false }
//
// 		// this.e('delete').subscribe(() => {
// 		// 	for (let child of this.children) { child.delete() }
// 		// 	this.parent.children.delete(this);
// 		// });
// 	}
//
// 	// hasAncestor(pred) {
// 	// 	return pred(this) || this.parent && this.parent.hasAncestor(pred);
// 	// }
//
// 	// setParent(newParent) {
// 	// 	// /* check for nesting of model-sharing svg entities */
// 	// 	// let entity = newParent;
// 	// 	// while (entity) {
// 	// 	// 	if (entity.model === this.model) {
// 	// 	// 		throw new Error(`Nesting Error: Cannot set the parent of this entity to an entity that has a model that is a descendant of the model of this one.`);
// 	// 	// 	}
// 	// 	// 	entity = entity.parent;
// 	// 	// }
// 	//
// 	// 	/* actually set parent */
// 	// 	if (this.parent) { this.parent.children.delete(this) }
// 	// 	this.parent = newParent;
// 	// 	if (this.parent) {
// 	// 		this.parent.children.add(this);
// 	// 		this.root = this.parent.root;
// 	// 	} else {
// 	// 		this.root = this;
// 	// 	}
// 	// }
// 	//
// 	// traverse(types, fn) {
// 	// 	if (!fn) { [types, fn] = [null, types] }
// 	// 	if (types && !Array.isArray(types)) { types = [types] }
// 	// 	if (!types || types.some(type => this instanceof type)) {
// 	// 		fn(this);
// 	// 	}
// 	// 	for (let child of this.children) {
// 	// 		child.traverse(types, fn);
// 	// 	}
// 	// }
// 	//
// 	// moveToFront() {
// 	// 	for (let c = this; c !== c.root; c = c.parent) {
// 	// 		c.element.appendTo(c.element.parent());
// 	// 	}
// 	// }
//
// 	// deleteClicker() {
// 	// 	if (!this[deleteClicker]) {
// 	// 		this[deleteClicker] = new DeleteClicker();
// 	// 		this[deleteClicker].clicks.subscribe((event) => {
// 	// 			event.stopPropagation();
// 	// 			this.delete();
// 	// 		});
// 	// 	}
// 	// 	return this[deleteClicker];
// 	// }
//
// 	// startDraggingBy(event, options = {}) {
// 	// 	let {handle, tracker} = this.draggable();
// 	// 	if (!handle)  { handle = this.element                }
// 	// 	else          { handle = this.element.find(handle)   }
// 	// 	if (!tracker) { tracker = handle                     }
// 	// 	else          { tracker = this.element.find(tracker) }
// 	//
// 	// 	let interactable = interact(tracker[0]);
// 	//
// 	// 	Object.assign(event.interaction, options);
// 	//
// 	// 	interactable.rectChecker(element => element.getBoundingClientRect());
// 	// 	event.interaction.start(
// 	// 		{ name: 'drag' },
// 	// 		interactable,
// 	// 		tracker[0]
// 	// 	);
// 	//
// 	// 	return new Promise((resolve) => {
// 	// 		merge(
// 	// 			fromEvent(interactable, 'dragend') .map(()=>({ status: 'finished' })),
// 	// 			fromEvent($('body'), 'keyup').which(27).map(()=>({ status: 'aborted'  }))
// 	// 		).take(1).subscribe(resolve);
// 	// 	});
// 	// }
//
// 	// startResizingBy(event, edges = { bottom: true, right: true }) {
// 	// 	let {handle, tracker} = this.resizable();
// 	// 	if (!handle)  { handle = this.element                }
// 	// 	else          { handle = this.element.find(handle)   }
// 	// 	if (!tracker) { tracker = handle                     }
// 	// 	else          { tracker = this.element.find(tracker) }
// 	//
// 	// 	let interactable = interact(tracker[0]);
// 	//
// 	// 	event.interaction.start(
// 	// 		{ name: 'resize', edges },
// 	// 		interactable,
// 	// 		tracker[0]
// 	// 	);
// 	//
// 	// 	return new Promise((resolve) => {
// 	// 		merge(
// 	// 			fromEvent(interactable, 'resizeend').map(()=>({ status: 'finished' })),
// 	// 			$('body').asKefirStream('keyup').which(27) .map(()=>({ status: 'aborted'  }))
// 	// 		).take(1).subscribe(resolve);
// 	// 	});
// 	// 	// return new Promise((resolve) => {
// 	// 	// 	interact(tracker[0]).on('resizeend', function onResizeEnd() {
// 	// 	// 		interact(tracker[0]).off('resizeend', onResizeEnd);
// 	// 	// 		resolve(this);
// 	// 	// 	}.bind(this));
// 	// 	// });
// 	// }
//
// 	// to override
// 	// appendChildElement(newChild) { assert(()=>false) }
//
// }
