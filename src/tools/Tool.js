import ValueTracker, {property} from '../util/ValueTracker';
import $ from 'jquery';
// TODO: no longer need to import: fromEventPattern;
// TODO: no longer need to import: fromEvent;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: map;
// TODO: no longer need to import: never;
import {Observable} from '../libs/rxjs.js';

import {afterMatching, log} from "../util/rxjs";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {createSVGPoint, ID_MATRIX} from "../util/svg";
// TODO: make sure we don't need to import: switchMap;
// TODO: no longer need to import: of;
import {setCTM} from "../util/svg";
// TODO: make sure we don't need to import: withLatestFrom;
import {subscribe_} from "../util/rxjs";
import {SVGPoint, Vector2D} from "../util/svg";
import {tap} from "../util/rxjs";
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: concat;

import {assign} from 'bound-native-methods';

// TODO: no longer need to import: merge;
// TODO: make sure we don't need to import: sample;
import {animationFrames} from "../util/rxjs";
import Machine from "../util/Machine";


const $$root                 = Symbol('$$root');
const $$domEvents            = Symbol('$$domEvents');
const $$subscriptions        = Symbol('$$subscriptions');
const $$scratchSVGPoint      = Symbol('$$scratchSVGPoint');
const $$tools                = Symbol('$$tools');
const $$toolTools            = Symbol('$$toolTools');
const $$canvasTransformTools = Symbol('$$canvasTransformTools');


function enrichMouseEvent(context, {sampleEvents = false} = {}) {
	const optionallySample = sampleEvents
		? function () { return this.sample(animationFrames) }
		: function () { return this };
	return this
		::optionallySample()
		.withLatestFrom(context.p('canvasScreenCTM'), (event, canvasScreenCTM) => {
			event.controller = $(event.currentTarget).association('controller');
			let svgPoint = new SVGPoint(event.pageX, event.pageY).matrixTransform(canvasScreenCTM.inverse());
			event.point = new Vector2D({
				x:       svgPoint.x,
				y:       svgPoint.y,
				context: context.root.inside
			});
			return event;
		});
}

export default class Tool extends ValueTracker {
	
	static events = new Set();
	
	@property({ initial: true }) active;
	
	constructor(context, {events = []} = {}) {
		super();
		
		this.context = context;
		
		if (!context[$$canvasTransformTools]) {
			context[$$canvasTransformTools] = true;
			context.newProperty('canvasCTM', { initial: ID_MATRIX })
				.subscribe( context.root.inside::setCTM );
			context.newProperty('canvasScreenCTM', { readonly: true, initial: context.root.inside.getScreenCTM() });
			context.p('canvasCTM')
				.map(() => context.root.inside.getScreenCTM())
				::subscribe_( context.pSubject('canvasScreenCTM'), v=>v() );
			context.stateMachine = new Machine('IDLE');
		}
		if (!context[$$domEvents]) {
			context[$$domEvents] = {};
		}
		for (let e of events) {
			this.registerArtefactEvent(e);
		}
		context[this.constructor.name] = this;
	}
	
	registerArtefactEvent(e) {
		if (!this.context[$$domEvents][e]) {
			this.context[$$domEvents][e] = Observable.merge(
				Observable.fromEventPattern(
					(handler) => { this.context.root.element.jq.on (e, '[controller]', handler) },
					(handler) => { this.context.root.element.jq.off(e, '[controller]', handler) }
				),
				Observable.fromEventPattern(
					(handler) => { this.context.root.element.jq.on (e, handler) },
					(handler) => { this.context.root.element.jq.off(e, handler) }
				)
			)::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' });
		}
	}
	
	rootE  (e)   { return Observable.fromEvent(this.context.root.element.jq, e)::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	windowE(e)   { return Observable.fromEvent($(window), e)                   ::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	documentE(e) { return Observable.fromEvent($(document), e)                 ::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	
	e(event) {
		return this.p('active')
			.switchMap(a => a ? this.context[$$domEvents][event] : Observable.never());
	}
}
