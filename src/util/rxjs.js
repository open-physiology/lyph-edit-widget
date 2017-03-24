// TODO: no longer need to import: fromEvent;
// TODO: no longer need to import: combineLatest;

// TODO: no longer need to import: of;
// TODO: no longer need to import: never;
// TODO: make sure we don't need to import: switchMap;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: withLatestFrom;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: ignoreElements;
// TODO: make sure we don't need to import: concat;
// TODO: make sure we don't need to import: delayWhen;

import isUndefined from 'lodash-bound/isUndefined';
import isFunction from 'lodash-bound/isFunction';
import {createSVGPoint} from "./svg";
import {tY} from "./svg";
import {tX} from "./svg";
import {Observable} from "../libs/rxjs.js";
import {AnimationFrame} from '../libs/rxjs.js';

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
	return this.ignoreElements().concat(Observable.of(value));
}

export function afterMatching(other, cancel = Observable.never()) {
	return this.switchMap(orig => Observable.of(orig)
		.delayWhen( other::ignoreElements )
		.takeUntil( cancel                )
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
