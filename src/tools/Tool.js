import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {filter} from 'rxjs/operator/filter';

import pick from 'lodash-bound/pick';

const $$context       = Symbol('$$context');
const $$root          = Symbol('$$root');
const $$domEvents     = Symbol('$$domEvents');
const $$subscriptions = Symbol('$$subscriptions');
const $$scratchSVGPoint = Symbol('$$scratchSVGPoint');

//extends ValueTracker
export default class Tool  {
	
	constructor(context, {events}) {
		this[$$context] = context;
		this[$$root] = root;
		
		const {root} = context;
		
		const jqArgs = [events.join(' '), '[controller]'];
		this[$$domEvents] = fromEventPattern(
			(handler) => { root.on (...jqArgs, handler) },
			(handler) => { root.off(...jqArgs, handler) },
			(event) => {
				event.controller = $(event.currentTarget).data('controller');
				return event;
			}
		);
		
		/* create svg point for scratch use */
		this[$$scratchSVGPoint] = this[$$context].root[0].createSVGPoint();
	}
	
	e(event) {
		return this[$$domEvents]
			::filter(e => e.type === event);
	}
	
	xy_page_to_viewport({pageX = 0, pageY = 0, x = pageX, y = pageY}) {
		const offset = this[$$context].root.offset();
		return {
			x: x - offset.left,
			y: y - offset.top
		};
	}
	
	xy_viewport_to_canvas({pageX = 0, pageY = 0, x = pageX, y = pageY}) {
		this[$$scratchSVGPoint].x = x;
		this[$$scratchSVGPoint].y = y;
        return this[$$scratchSVGPoint]
	        .matrixTransform(this[$$context].canvas[0].getCTM().inverse())
	        ::pick('x', 'y');
	}
	
}

