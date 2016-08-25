import ValueTracker, {property} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {never} from 'rxjs/observable/never';

import pick from 'lodash-bound/pick';
import {afterMatching} from "../util/rxjs";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {createSVGPoint} from "../util/svg";
import {$$elementCtrl} from "../symbols";
import {switchMap} from "rxjs/operator/switchMap";

const $$root          = Symbol('$$root');
const $$domEvents     = Symbol('$$domEvents');
const $$subscriptions = Symbol('$$subscriptions');
const $$scratchSVGPoint = Symbol('$$scratchSVGPoint');

const $$tools = Symbol('$$tools');
const $$toolTools = Symbol('$$toolTools');

export default class Tool extends ValueTracker {
	
	@property({ initial: true }) active;
	
	constructor(context, {events = []} = {}) {
		super();
		
		this.context = context;
		
		const {root} = context;
		
		const addController = (event) => {
			event.controller = window[$$elementCtrl].get(event.currentTarget);
		};
		
		const jqArgs = [events.join(' '), '[controller]'];
		this[$$domEvents] = fromEventPattern(
			(handler) => { root.element.jq.on (...jqArgs, handler) },
			(handler) => { root.element.jq.off(...jqArgs, handler) }
		).do(addController);
	}
	
	e(event) {
		return this.p('active')::switchMap(
			a => a ? this[$$domEvents] : never()
		)::filter(e => e.type === event);
	}
	
}

