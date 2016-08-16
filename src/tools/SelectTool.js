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

//noinspection JSFileReferences
import {ALT} from 'keycode.js';


import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import head from 'lodash-bound/head';
import tail from 'lodash-bound/tail';
import clamp from 'lodash-bound/clamp';

import _head from 'lodash/head';
import _add from 'lodash/add';

import Tool from './Tool';
import {withMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {which} from "../util/misc";


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
		const mousewheel = fromEvent(root, 'mousewheel');
		const mouseleave = this.e('mouseleave');
		
		/* build selected artefact stream */
		merge(mouseenter, mouseleave)
			::scan((top, {controller, type}) => {
				switch (type) {
					case 'mouseenter': {
						controller[$$onStack] = true;
						if (controller.parent) {
							controller.parent[$$child] = controller;
						}
						if (!top) { top = controller }
					} break;
					case 'mouseleave': {
						delete controller[$$onStack];
						if (controller.parent) { controller.parent[$$child] = null }
					} break;
				}
				while (top && !top[$$onStack]) { top = top.parent }
				while (top && top[$$child]) { top = top[$$child] }
				return top || null;
			}, null)
			::distinctUntilChanged()
			::switchMap((top) => mousewheel
					::filter(withMod('alt'))
					.do(stopPropagation)
					::map(e=>e.deltaY)
					::scan((s, d) => s && s[d>0 ? 'parent' : $$child] || s, top)
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

