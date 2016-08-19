import {fromEvent} from 'rxjs/observable/fromEvent';
import {combineLatest} from 'rxjs/observable/combineLatest';

import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';

export function subscribe_(subject, nextPipe = n=>n(), completePipe = c=>c(), errorPipe = e=>e()) {
	return this.subscribe({
		next: (v) => nextPipe((toDebug) => {
			if (typeof toDebug !== 'undefined') {
				debugger;
			}
			return subject.next(v);
		}),
		complete: (v) => completePipe((toDebug) => {
			if (typeof toDebug !== 'undefined') {
				debugger;
			}
			return subject.complete(v);
		}),
		error: (v) => errorPipe((toDebug) => {
			if (typeof toDebug !== 'undefined') {
				debugger;
			}
			return subject.error(v);
		})
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

export function log(...args) {
	return this.do((value) => {
		console.log(...args, value);
	});
}

