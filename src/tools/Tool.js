import ValueTracker, {property} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {never} from 'rxjs/observable/never';

import pick from 'lodash-bound/pick';
import {afterMatching, log} from "../util/rxjs";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {createSVGPoint, ID_MATRIX} from "../util/svg";
import {$$elementCtrl} from "../symbols";
import {switchMap} from "rxjs/operator/switchMap";
import {merge} from "rxjs/operator/merge";
import {setCTM} from "../util/svg";
import {withLatestFrom} from "rxjs/operator/withLatestFrom";
import {subscribe_} from "../util/rxjs";
import {SVGPoint} from "../util/svg";

const $$root          = Symbol('$$root');
const $$domEvents     = Symbol('$$domEvents');
const $$subscriptions = Symbol('$$subscriptions');
const $$scratchSVGPoint = Symbol('$$scratchSVGPoint');

const $$tools     = Symbol('$$tools');
const $$toolTools = Symbol('$$toolTools');
const $$canvasTransformTools = Symbol('$$canvasTransformTools');


function enrichMouseEvent(context) {
	return this::withLatestFrom(context.p('canvasScreenCTM'), (event, canvasScreenCTM) => {
		event.controller = window[$$elementCtrl].get(event.currentTarget);
		event.point = new SVGPoint(event.pageX, event.pageY);
		event.point = event.point.matrixTransform(canvasScreenCTM.inverse());
		return event;
	});
}

export default class Tool extends ValueTracker {
	
	static events = new Set();
	
	@property({ initial: true }) active;
	
	constructor(context, {events = []} = {}) {
		super();
		
		this.context = context;
		
		const {root} = context;
		
		if (!context[$$canvasTransformTools]) {
			context[$$canvasTransformTools] = true;
			context.newProperty('canvasCTM', { initial: ID_MATRIX })
				.subscribe( root.inside::setCTM );
			context.newProperty('canvasScreenCTM', { readonly: true, initial: root.inside.getScreenCTM() });
			context.p('canvasCTM')
				::map(() => root.inside.getScreenCTM())
				::subscribe_( context.pSubject('canvasScreenCTM'), v=>v() );
		}
		
		if (!context[$$domEvents]) {
			context[$$domEvents] = {};
		}
		for (let e of events) {
			if (!context[$$domEvents][e]) {
				context[$$domEvents][e] = fromEventPattern(
					(handler) => { root.element.jq.on (e, '[controller]', handler) },
					(handler) => { root.element.jq.off(e, '[controller]', handler) }
				)::merge(fromEventPattern(
					(handler) => { root.element.jq.on (e, handler) },
					(handler) => { root.element.jq.off(e, handler) }
				))::enrichMouseEvent(context)
			}
		}
		
		context[this.constructor.name] = this;
	}
	
	rootE  (event) { return fromEvent(this.context.root.element.jq, event)::enrichMouseEvent(this.context) }
	windowE(event) { return fromEvent($(window), event)                   ::enrichMouseEvent(this.context) }
	
	e(event) {
		return this.p('active')
			::switchMap(a => a ? this.context[$$domEvents][event] : never());
	}
}

