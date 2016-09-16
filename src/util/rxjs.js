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
import isFunction from 'lodash-bound/isFunction';
import {createSVGPoint} from "./svg";
import {tY} from "./svg";
import {tX} from "./svg";
import {Observable} from "rxjs/Observable";
import {AnimationFrame} from 'rxjs/util/AnimationFrame'

export function subscribe_(subject, pipeFn = n=>n()) {
	const handler = (key) => ((v) => pipeFn((toDebug) => {
		if (!toDebug::isUndefined()) { debugger }
		return subject[key](v);
	}));
	// const handler = (key) => ::subject[key];
	return this.subscribe(
		handler('next'    )
		// handler('error'   ), // TODO: fix weirdness when these
		// handler('complete')  //     : are uncommented
	);
}

export function log(...args) {
	return this::tap((value) => {
		console.log(...args, value);
	});
}

export function emitWhenComplete(value) {
	return this::ignoreElements()::concat(of(value));
}

export function afterMatching(other, cancel = never()) {
	return this::switchMap(orig => of(orig)
		::delayWhen( other::ignoreElements )
		::takeUntil( cancel                )
	);
}

export const tap = Observable.prototype.do;

export const subscribe = Observable.prototype.subscribe;

export const animationFrames = Observable.create((observer) => {
	let requestId;
	let callback = () => {
        if (requestId !== undefined) {
            requestId = AnimationFrame.requestAnimationFrame(callback);
        }
        observer.next();
    };
    requestId = AnimationFrame.requestAnimationFrame(callback);
    return () => {
        if (!requestId::isUndefined()) {
            let r = requestId;
            requestId = undefined;
	        AnimationFrame.cancelAnimationFrame(r);
        }
    };
});
