import {multiply as _multiply} from 'lodash';

import Tool from './Tool';
import {withoutMod, stopPropagation} from "../util/misc";
import {subscribe_, log, tap} from "../util/rxjs";

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
			.filter(withoutMod('alt', 'ctrl', 'meta'))
			.do(stopPropagation);
		
		/* maintain the current zoom-factor on the side (it doesn't actually influence zoom) */
		zooming
			.withLatestFrom(context.p('zoomSensitivity'),
				({deltaY: d}, s) => Math.pow(1+s, d))
			.scan(_multiply, 1)
			.subscribe( context.pSubject('zoomFactor') );
		
		/* maintain zoom-exponent by mouse-wheel */
		zooming
			.withLatestFrom(context.p('canvasCTM'), context.p('zoomSensitivity'),
				({deltaY: d, point}, m, s) => m::scaleFromPoint(Math.pow(1+s, d), point))
			.subscribe( context.p('canvasCTM') );
		
	}
	
}
