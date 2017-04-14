import {Observable} from '../libs/rxjs.js';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {tap} from "../util/rxjs";
import Canvas from "../artefacts/Canvas";
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
		
		context.stateMachine.extend(({ enterState, subscribeDuringState }) => ({
			'IDLE': () => this.e('mousedown')
				.filter(withoutMod('ctrl', 'shift', 'meta'))
				.do(stopPropagation)
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
					::subscribeDuringState((diff) => {
						context.canvasCTM = transformationStart
							.translate(...diff.xy);
					});
				
				/* stop panning */
				mouseup::enterState('IDLE');
			}
		}));
		
	}
	
	
	
}

