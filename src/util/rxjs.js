import {isUndefined}                from 'lodash-bound';
import {Observable, AnimationFrame} from '../libs/rxjs.js';

export function subscribe_(subject, pipeFn = n=>n()) { // TODO: Stop using this everywhere
	const handler = (key) => ((v) => pipeFn((toDebug) => {
		if (!toDebug::isUndefined()) { debugger }
		return subject[key](v);
	}));
	// const handler = (key) => ::subject[key];
	return this.subscribe(
		handler('next'    )//,
		// handler('error'   ), // TODO: fix weirdness when these
		// handler('complete')  //     : are uncommented
	);
}

export function log(...args) {
	return this.do((value) => {
		console.log(...args, value);
	});
}

export function emitWhenComplete(value) {
	return this.ignoreElements().concat(Observable.of(value));
}

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
