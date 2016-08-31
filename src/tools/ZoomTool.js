import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {filter} from 'rxjs/operator/filter';
import {map} from 'rxjs/operator/map';
import {scan} from 'rxjs/operator/scan';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import _multiply from 'lodash/multiply';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {subscribe_, log} from "../util/rxjs";
import {withLatestFrom} from "rxjs/operator/withLatestFrom";
import {scaleFromPoint} from "../util/svg";


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
			::filter(withoutMod('alt', 'ctrl', 'meta'))
			.do(stopPropagation);
		
		/* maintain the current zoom-factor on the side (it doesn't actually influence zoom) */
		zooming
			::withLatestFrom(context.p('zoomSensitivity'),
				({deltaY: d}, s) => Math.pow(1+s, d))
			::scan(_multiply, 1)
			::subscribe_( context.pSubject('zoomFactor') , n=>n() );
		
		/* maintain zoom-exponent by mouse-wheel */
		zooming
			::withLatestFrom(context.p('canvasCTM'), context.p('zoomSensitivity'),
				({deltaY: d, point}, m, s) => m::scaleFromPoint(Math.pow(1+s, d), point))
			::subscribe_( context.p('canvasCTM') , n=>n() );
		
	}
	
}
