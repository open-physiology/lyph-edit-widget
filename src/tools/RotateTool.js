import $ from 'jquery';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {of} from 'rxjs/observable/of';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {concat} from 'rxjs/operator/concat';

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
import {never} from "rxjs/observable/never";
import {ignoreElements} from "rxjs/operator/ignoreElements";
import {skipUntil} from "rxjs/operator/skipUntil";
import {delay} from "rxjs/operator/delay";
import {skip} from "rxjs/operator/skip";
import {subscribe_} from "../util/rxjs";
import {shiftedMMovementFor} from "../util/rxjs";
import {emitWhenComplete, tap} from "../util/rxjs";
import {mapTo} from "rxjs/operator/mapTo";
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
		// 	let isDragging    = handleArtifact.p('dragging')::filter(d=>d);
		// 	let isNotDragging = handleArtifact.p('dragging')::filter(d=>!d);
		// 	let isSelected    = handleArtifact.p('selected')::filter(s=>s);
		// 	let isNotSelected = handleArtifact.p('selected')::filter(s=>!s);
		// 	let GRAB     = '-webkit-grab -moz-grab grab';
		// 	let GRABBING = '-webkit-grabbing -moz-grabbing grabbing';
		// 	return of(GRAB)::concat(isDragging
		// 		// ::takeUntil( combineLatest(isNotDragging::skip(1), isNotSelected::skip(1)::delay(100), (nd,ns)=>nd&&ns)::filter(v=>v) )
		// 		::switchMap(() => of(GRABBING)
		// 			::concat(never()::takeUntil(isNotDragging))
		// 			::concat(of(GRAB)))
		// 	);
		// });
		
		
		context.stateMachine.extend(({ enterState, subscribe }) => ({
			'IDLE': () => this.e('mousedown')
				::filter(withMod('shift'))
				::tap(stopPropagation)
				::withLatestFrom(context.p('selected'))
				::filter(([,handleArtifact]) => handleArtifact.draggable && handleArtifact.free)
				::map(([downEvent, rotatingArtefact]) => ({mousedownVector: downEvent.point, rotatingArtefact}))
		        ::enterState('INSIDE_ROTATE_THRESHOLD'),
			'INSIDE_ROTATE_THRESHOLD': ({mousedownVector, rotatingArtefact}) => [
				mousemove
					::take(4)
					::ignoreElements()
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

