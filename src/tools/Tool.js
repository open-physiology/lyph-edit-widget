import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';

import pick from 'lodash-bound/pick';
import {afterMatching} from "../util/rxjs";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {createSVGPoint} from "../util/svg";
import {$$elementCtrl} from "../symbols";
import {$$context} from "../symbols";

const $$root          = Symbol('$$root');
const $$domEvents     = Symbol('$$domEvents');
const $$subscriptions = Symbol('$$subscriptions');
const $$scratchSVGPoint = Symbol('$$scratchSVGPoint');

const $$tools = Symbol('$$tools');
const $$toolTools = Symbol('$$toolTools');

export default class Tool  {
	
	constructor(context, {events = []} = {}) {
		this[$$context] = context;
		
		const {root} = context;
		
		const addController = (event) => {
			event.controller = window[$$elementCtrl].get(event.currentTarget);
		};
		
		const jqArgs = [events.join(' '), '[controller]'];
		this[$$domEvents] = fromEventPattern(
			(handler) => { root.element.jq.on (...jqArgs, handler) },
			(handler) => { root.element.jq.off(...jqArgs, handler) }
		).do(addController);
		
		/* create svg point for scratch use */
		this[$$scratchSVGPoint] = root.element.createSVGPoint();
	}
	
	e(event) {
		return this[$$domEvents]
			::filter(e => e.type === event);
	}
	
	xy_page_to_viewport({pageX = 0, pageY = 0, x = pageX, y = pageY}) {
		const offset = $(this[$$context].root).offset();
		return {
			x: x - offset.left,
			y: y - offset.top
		};
	}
	
	xy_viewport_to_canvas({pageX = 0, pageY = 0, x = pageX, y = pageY}) {
		this[$$scratchSVGPoint].x = x;
		this[$$scratchSVGPoint].y = y;
        return this[$$scratchSVGPoint]
	        .matrixTransform(this[$$context].root.inside.getCTM().inverse())
	        ::pick('x', 'y');
	}
	
}

