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
import {withoutMod} from "../util/misc";
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
				::filter(withoutMod('ctrl', 'shift', 'meta'))
				::tap(stopPropagation)
				::withLatestFrom(context.p('selected'))
				::filter(([,handleArtifact]) => handleArtifact instanceof Canvas)
				::map(([downEvent]) => ({downEvent}))
		        ::enterState('PANNING'),
			'PANNING': ({downEvent}) =>  {
				/* record start dimensions */
				const transformationStart = context.canvasCTM;
				// let mouseStart = downEvent::page();
				
				/* move while dragging */
				of(downEvent)::concat(mousemove)
					::map(event => event::pagePoint().minus(downEvent::pagePoint()))
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

