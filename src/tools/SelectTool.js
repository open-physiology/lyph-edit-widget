import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {startWith} from 'rxjs/operator/startWith';
import {merge} from 'rxjs/observable/merge';
import {scan} from 'rxjs/operator/scan';
import {map} from 'rxjs/operator/map';
import {pairwise} from 'rxjs/operator/pairwise';
import {distinctUntilChanged} from 'rxjs/operator/distinctUntilChanged'
import {Subject} from 'rxjs/Subject';

//noinspection JSFileReferences
import {ALT} from 'keycode.js';


import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import head from 'lodash-bound/head';
import tail from 'lodash-bound/tail';
import clamp from 'lodash-bound/clamp';
import defaults from 'lodash-bound/defaults';

import _head from 'lodash/head';
import _add from 'lodash/add';

import Tool from './Tool';
import {withMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {which} from "../util/misc";


import indent from 'indent-string';


const $$selectTools = Symbol('$$selectTools');
const $$child   = Symbol('$$child');
const $$onStack = Symbol('$$onStack');

export default class SelectTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mouseenter', 'mouseleave'] });
		
		let {root} = context;
		
		/* equip context object */
		if (!context[$$selectTools]) {
			context[$$selectTools] = true;
			context.newProperty('selected');
		}
		
		/* basic event-streams */
		const mouseenter = this.e('mouseenter');
		const mousewheel = fromEvent(root.element.jq, 'mousewheel');
		const mouseleave = this.e('mouseleave');
		
		/* build selected artefact stream */
		merge(mouseenter, mouseleave)
			::scan((top, {controller, type}) => {
				
				
				
				switch (type) {
					case 'mouseenter': onMouseenter(controller); break;
					case 'mouseleave': onMouseleave(controller); break;
				}
				
				
				
				// const printTree = (ctrlr, isChild) => {
				// 	let str = `${ctrlr}`;
				// 	if (ctrlr[$$onStack]) {
				// 		str += ` - on stack`;
				// 		if (isChild) {
				// 			str += ` - (CHILD)`;
				// 		}
				// 	}
				// 	str += '\n';
				// 	for (let child of ctrlr.children) {
				// 		str += indent(printTree(child, child === ctrlr[$$child]), 2);
				// 	}
				// 	return str;
				// };
				// console.log('------------------------------');
				// console.log(printTree(root));
				// console.log('------------------------------');
				
				
				
				while (top !== root && !top[$$onStack]) { top = top.parent   }
				while (top[$$child])    { top = top[$$child] }
				return top;
			
				function onMouseenter(ctrlr) {
					ctrlr[$$onStack] = true;
					if (ctrlr.parent) {
						ctrlr.parent[$$child] = ctrlr;
					}
					if (!top) { top = ctrlr }
				}
				function onMouseleave(ctrlr) {
					if (ctrlr === root) { return }
					delete ctrlr[$$onStack];
					if (ctrlr.parent && ctrlr.parent[$$child] === ctrlr) {
						delete ctrlr.parent[$$child];
					}
				}
			
			}, root)
			::distinctUntilChanged()
			// .do((v)=>{ console.log('(top)', v.model.name) })
			::switchMap((top) => mousewheel
				::filter(withMod('alt'))
				.do(stopPropagation)
				::map(e=>e.deltaY)
				::scan((s, d) => {
					// s && s[d>0 ? 'parent' : $$child] || s;
					let next = s[d>0 ? 'parent' : $$child];
					if (!next || next === root) { return s }
					return next;
					// return s && s[d>0 ? 'parent' : $$child] || s;
				}, top)
				::startWith(top))
			.subscribe( context.p('selected') );
		
		
		// const altPressed = merge(
		// 	fromEvent($(window), 'keydown')::which(ALT)::map(()=>true),
		// 	fromEvent($(window), 'keyup')  ::which(ALT)::map(()=>false)
		// );
		
		context.p('selected')::pairwise().subscribe(([prev, curr]) => {
			if (prev) { prev.highlighted = false }
			if (curr) { curr.highlighted = true  }
		});
		
		// TODO: change cursor to be appropriate for
		//     : manipulation on selected artefact
		
	}
	
	
	
}

