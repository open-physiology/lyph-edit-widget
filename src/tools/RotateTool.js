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

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import isFunction from 'lodash-bound/isFunction';
import defaults from 'lodash-bound/defaults';

import Tool from './Tool';
import {withoutMod, withMod} from "../util/misc";
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
import {subscribe_} from "../util/rxjs";
import {shiftedMMovementFor} from "../util/rxjs";
import {emitWhenComplete, tap} from "../util/rxjs";
// TODO: make sure we don't need to import: mapTo;
import Machine from "../util/Machine";
import {rotateFromVector, tX, tY} from "../util/svg";
import {Vector2D} from "../util/svg";
import {M21} from "../util/svg";
import {M22} from "../util/svg";
import {rotateAround} from "../util/svg";
import {snap45} from "../util/svg";


const {atan2, floor} = Math;


export default class RotateTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
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
				.filter(withMod('shift'))
				::tap(stopPropagation)
				.withLatestFrom(context.p('selected'))
				.filter(([,handleArtifact]) => handleArtifact.draggable && handleArtifact.free)
				.map(([downEvent, rotatingArtefact]) => ({mousedownVector: downEvent.point, rotatingArtefact}))
		        ::enterState('INSIDE_ROTATE_THRESHOLD'),
			'INSIDE_ROTATE_THRESHOLD': ({mousedownVector, rotatingArtefact}) => [
				mousemove
					.take(4)
					.ignoreElements()
					::emitWhenComplete({mousedownVector, rotatingArtefact})
					::enterState('ROTATING'),
			    mouseup
				    ::enterState('IDLE')
				// TODO: go IDLE on pressing escape
			],
			'ROTATING': ({mousedownVector, rotatingArtefact}) =>  {
				
				/* setup */
				rotatingArtefact.dragging = true; // TODO: rename
				
				/* pre-processing */
				const {width, height, transformation} = rotatingArtefact::pick('transformation', 'width', 'height');
				const startAngle = atan2(transformation[M21], transformation[M22]) * 180 / Math.PI;
				const nonRotatedMatrix = transformation
					::rotateAround({
						x: 0.5*width,
						y: 0.5*height
					}, -startAngle);
				const center = new Vector2D({
					x: nonRotatedMatrix[tX] + width  / 2,
					y: nonRotatedMatrix[tY] + height / 2
				});
				const startDiff  = mousedownVector.minus(center);
				const initialMouseAngle = atan2(startDiff.y, startDiff.x) * 180 / Math.PI;
				
				/* rotate while dragging */
				mousemove::subscribe((moveEvent) => {
					let mouseVector = moveEvent.point;//.in(rotatingArtefact.element);
					let currentDiff = mouseVector.minus(center);
					let angle = atan2(currentDiff.y, currentDiff.x) / Math.PI * 180;
					angle -= initialMouseAngle;
					if (moveEvent.ctrlKey) {
						angle = floor(angle / 45) * 45;
					}
					rotatingArtefact.transformation = transformation
						::rotateAround({ x: 0.5*width, y: 0.5*height }, angle);
				});
				
				/* stop rotating on mouseup */
				mouseup
					::tap(() => { rotatingArtefact.dragging = false })
					::enterState('IDLE');
			}
		}));
		
		
		
		
	}
	
	
	
}

