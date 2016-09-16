import ValueTracker, {property} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {never} from 'rxjs/observable/never';

import {afterMatching, log} from "../util/rxjs";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {createSVGPoint, ID_MATRIX} from "../util/svg";
import {$$elementCtrl} from "../symbols";
import {switchMap} from "rxjs/operator/switchMap";
import {of} from "rxjs/observable/of";
import {setCTM} from "../util/svg";
import {withLatestFrom} from "rxjs/operator/withLatestFrom";
import {subscribe_} from "../util/rxjs";
import {SVGPoint, Vector2D} from "../util/svg";
import {tap} from "../util/rxjs";
import {takeUntil} from "rxjs/operator/takeUntil";
import {concat} from "rxjs/operator/concat";

import {assign} from 'bound-native-methods';

import {merge} from "rxjs/observable/merge";
import {sample} from "rxjs/operator/sample";
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
		? function () { return this::sample(animationFrames) }
		: function () { return this };
	return this
		::optionallySample()
		::withLatestFrom(context.p('canvasScreenCTM'), (event, canvasScreenCTM) => {
			event.controller = window[$$elementCtrl].get(event.currentTarget);
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
				::map(() => context.root.inside.getScreenCTM())
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
			this.context[$$domEvents][e] = merge(
				fromEventPattern(
					(handler) => { this.context.root.element.jq.on (e, '[controller]', handler) },
					(handler) => { this.context.root.element.jq.off(e, '[controller]', handler) }
				),
				fromEventPattern(
					(handler) => { this.context.root.element.jq.on (e, handler) },
					(handler) => { this.context.root.element.jq.off(e, handler) }
				)
			)::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' });
		}
	}
	
	rootE  (e)   { return fromEvent(this.context.root.element.jq, e)::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	windowE(e)   { return fromEvent($(window), e)                   ::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	documentE(e) { return fromEvent($(document), e)                 ::enrichMouseEvent(this.context, { sampleEvents: e === 'mousemove' }) }
	
	e(event) {
		return this.p('active')
			::switchMap(a => a ? this.context[$$domEvents][event] : never());
	}
}
