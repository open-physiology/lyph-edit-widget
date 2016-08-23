import {fromEvent} from 'rxjs/observable/fromEvent';
import {combineLatest} from 'rxjs/observable/combineLatest';

import {of} from 'rxjs/observable/of';
import {never} from 'rxjs/observable/never';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {ignoreElements} from 'rxjs/operator/ignoreElements';
import {concat} from 'rxjs/operator/concat';
import {delayWhen} from 'rxjs/operator/delayWhen';

import isUndefined from 'lodash-bound/isUndefined';
import {createSVGPoint} from "./svg";

export function subscribe_(subject, pipeFn = n=>n()) {
	const handler = (key) => ({
		[key]: (v) => pipeFn((toDebug) => {
			if (!toDebug::isUndefined()) { debugger }
			return subject[key](v);
		})
	});
	return this.subscribe({
		...handler('next'    ),
		...handler('complete'),
		...handler('error'   )
	});
}

export function shiftedMovementFor(obj_xy) {
	return combineLatest(this::take(1), obj_xy::take(1), (ref, obj) => ({
		x: obj.x - ref.x,
		y: obj.y - ref.y
	}))::switchMap(
		() => this,
		(delta, next) => ({
			x: next.x + delta.x,
			y: next.y + delta.y
		})
	);
}

const ID_MATRIX = document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix();

export function shiftedMatrixMovementFor(obj_m) {
	return combineLatest(
		this::take(1), obj_m::take(1),
		(ref, obj) => obj.translate(-ref.x, -ref.y)
	)::switchMap(
		() => this,
		(delta, next) => delta.translate(next.x, next.y)
	);
}

export function log(...args) {
	return this.do((value) => {
		console.log(...args, value);
	});
}

export function afterMatching(other, cancel = never()) {
	return this::switchMap(orig => of(orig)
		::delayWhen(()=>other::ignoreElements())
		::takeUntil(cancel));
}

export function svgPageCoordinates({pageX = 0, pageY = 0, x = pageX, y = pageY}) {
	return createSVGPoint(x, y);
}

