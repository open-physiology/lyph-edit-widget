import $ from 'jquery';
// TODO: no longer need to import: fromEvent;
// TODO: no longer need to import: of;
// TODO: no longer need to import: combineLatest;
// TODO: make sure we don't need to import: switchMap;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: withLatestFrom;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: concat;
import {Observable} from '../libs/rxjs.js';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import isFunction from 'lodash-bound/isFunction';
import defaults from 'lodash-bound/defaults';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor, log} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {POINT} from "../util/svg";
// TODO: no longer need to import: never;
// TODO: make sure we don't need to import: ignoreElements;
// TODO: make sure we don't need to import: skipUntil;
// TODO: make sure we don't need to import: delay;
// TODO: make sure we don't need to import: skip;
import {setCTM} from "../util/svg";
import {subscribe_} from "../util/rxjs";
import {tap} from "../util/rxjs";
import Canvas from "../artefacts/Canvas";
import {Vector2D} from "../util/svg";
import {pagePoint} from "../util/svg";


export default class PanTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const mousemove = this.windowE('mousemove');
		const mouseup   = this.windowE('mouseup');
		
		// context.registerCursor((handleArtifact) => {
		// 	if (!handleArtifact.draggable) { return false }
		// 	let isDragging    = handleArtifact.p('dragging').filter(d=>d);
		// 	let isNotDragging = handleArtifact.p('dragging').filter(d=>!d);
		// 	let isSelected    = handleArtifact.p('selected').filter(s=>s);
		// 	let isNotSelected = handleArtifact.p('selected').filter(s=>!s);
		// 	let GRAB     = '-webkit-grab -moz-grab grab';
		// 	let GRABBING = '-webkit-grabbing -moz-grabbing grabbing';
		// 	return Observable.of(GRAB).concat(isDragging
		// 		// .takeUntil( Observable.combineLatest(isNotDragging.skip(1), isNotSelected.skip(1).delay(100), (nd,ns)=>nd&&ns).filter(v=>v) )
		// 		.switchMap(() => Observable.of(GRABBING)
		// 			.concat(Observable.never().takeUntil(isNotDragging))
		// 			.concat(Observable.of(GRAB)))
		// 	);
		// });
		
		context.stateMachine.extend(({ enterState, subscribe }) => ({
			'IDLE': () => this.e('mousedown')
				.filter(withoutMod('ctrl', 'shift', 'meta'))
				::tap(stopPropagation)
				.withLatestFrom(context.p('selected'))
				.filter(([,handleArtifact]) => handleArtifact instanceof Canvas)
				.map(([downEvent]) => ({downEvent}))
		        ::enterState('PANNING'),
			'PANNING': ({downEvent}) =>  {
				/* record start dimensions */
				const transformationStart = context.canvasCTM;
				// let mouseStart = downEvent::page();
				
				/* move while dragging */
				Observable.of(downEvent).concat(mousemove)
					.map(event => event::pagePoint().minus(downEvent::pagePoint()))
					::subscribe((diff) => {
						context.canvasCTM = transformationStart
							.translate(...diff.xy);
					});
				
				/* stop panning */
				mouseup::enterState('IDLE');
			}
		}));
		
	}
	
	
	
}

