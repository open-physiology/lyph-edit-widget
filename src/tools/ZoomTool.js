import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {filter} from 'rxjs/operator/filter';
import {map} from 'rxjs/operator/map';
import {scan} from 'rxjs/operator/scan';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import _add from 'lodash/add';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";


const $$zoomTools = Symbol('$$zoomTools');

export default class ZoomTool extends Tool {
	
	constructor(context) {
		super(context, { events: [] });
		
		let {root, paper} = context;
		
		if (!context[$$zoomTools]) {
			
			context[$$zoomTools] = true;
			
			context.newProperty('zoomSensitivity', { initial: 0.2 });
			context.newProperty('zoomExponent',    { initial: 0   });
			context.newProperty('zoomFactor');
			
			/* maintain zoom-factor through exponent and sensitivity */
			context.p(
				['zoomExponent', 'zoomSensitivity'], [],
				(zExp, zSens) => Math.pow(1 + zSens, zExp)
			).subscribe( context.p('zoomFactor') );
		
			/* zoom as specified by current zoom factor */
			context.p('zoomFactor').subscribe((zFact) => {
				paper.zoomTo(zFact, 100);
			});
			
		}
		
		const mousewheel = fromEvent(root, 'mousewheel');
		
		/* maintain zoom-exponent by mouse-wheel */
		mousewheel
			::filter(withoutMod('alt', 'ctrl', 'meta'))
			.do(stopPropagation)
			::map(e => e.deltaY)
			::scan(_add, 0)
			.subscribe( context.p('zoomExponent') );
		
	}
	
}
