import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
// TODO: no longer need to import: fromEventPattern;
// TODO: no longer need to import: fromEvent;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: scan;

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import _multiply from 'lodash/multiply';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {subscribe_, log} from "../util/rxjs";
// TODO: make sure we don't need to import: withLatestFrom;
import {scaleFromPoint} from "../util/svg";
import {tap} from "../util/rxjs";


const $$zoomTools = Symbol('$$zoomTools');

export default class ZoomTool extends Tool {
	
	constructor(context) {
		super(context, { events: [] });
		
		let {root} = context;
		
		if (!context[$$zoomTools]) {
			context[$$zoomTools] = true;
			
			context.newProperty('zoomSensitivity', { initial: 0.04 });
			context.newProperty('zoomFactor',      { initial: 1, readonly: true });
		}
		
		const mousewheel = this.rootE('mousewheel');
		
		const zooming = mousewheel
			.filter(withoutMod('alt', 'ctrl', 'meta'))
			::tap(stopPropagation);
		
		/* maintain the current zoom-factor on the side (it doesn't actually influence zoom) */
		zooming
			.withLatestFrom(context.p('zoomSensitivity'),
				({deltaY: d}, s) => Math.pow(1+s, d))
			.scan(_multiply, 1)
			::subscribe_( context.pSubject('zoomFactor') , n=>n() );
		
		/* maintain zoom-exponent by mouse-wheel */
		zooming
			.withLatestFrom(context.p('canvasCTM'), context.p('zoomSensitivity'),
				({deltaY: d, point}, m, s) => m::scaleFromPoint(Math.pow(1+s, d), point))
			::subscribe_( context.p('canvasCTM') , n=>n() );
		
	}
	
}
