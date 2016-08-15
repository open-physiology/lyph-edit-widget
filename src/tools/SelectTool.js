import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {merge} from 'rxjs/operator/merge';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';

import Tool from './Tool';
import {withMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";


const $$selectTools = Symbol('$$selectTools');

export default class SelectTool extends Tool {
	
	constructor(context) {
		super(context, { events: [
			'mouseenter',
			'mouseleave',
			'mousewheel'
		] });
		
		let {root, paper} = context;
		
		if (!context[$$selectTools]) {
			context[$$selectTools] = true;
			context.newProperty('selectedArtifact', {
				readonly: true,
				initial:  null
			});
		}
		
		
		const mouseenter = this.p('mouseenter');
		const mousewheel = this.p('mousewheel');
		const mouseleave = this.p('mouseleave');
		
		const selectWheel = mousewheel::filter(withMod('alt'));
		
		const crossingBorder = merge(mouseleave, mouseenter);
		
		mouseenter
			::filter(withoutMod('shift'))
			.do(stopPropagation)
			::mergeMap(() => selectWheel::takeUntil(crossingBorder), (enter, wheel) => {
				
			})
			.subscribe((v) => {
				
			});
		
		
		
		
		
		
		
	}
	
	
	
}

