import {assign, isFunction} from 'lodash-bound';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";

import {tap} from "../util/rxjs";

import {emitWhenComplete} from "../util/rxjs";
import {snap45} from "../util/svg";


function reassessHoveredArtefact(a) {
	if (!a){ return }
	a.element.jq.mouseleave();
	reassessHoveredArtefact(a.parent);
	if (a.element.jq.is(':hover')) {
		a.element.jq.mouseenter();
	}
}


export default class DragDropTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
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
				.filter(([,handleArtifact]) => handleArtifact.draggable)
				.map(([downEvent, movingArtefact]) => ({mousedownVector: downEvent.point, movingArtefact}))
		        ::enterState('INSIDE_MOVE_THRESHOLD'),
			'INSIDE_MOVE_THRESHOLD': ({mousedownVector, movingArtefact}) => [
				mousemove
					.take(4)
					.ignoreElements()
					::emitWhenComplete({mousedownVector, movingArtefact})
					::enterState('MOVING'),
			    mouseup
				    ::enterState('IDLE')
				// TODO: go IDLE on pressing escape
			],
			'MOVING': ({mousedownVector, movingArtefact, referencePoint, reassessSelection = true}) =>  {
				/* start dragging */
				movingArtefact.dragging = true;
				if (reassessSelection) {
					for (let a of movingArtefact.traverse('post')) {
						a.element.jq.mouseleave();
					}
					reassessHoveredArtefact(movingArtefact.parent);
				}
				
				movingArtefact.moveToFront();
				
				/* record start dimensions */
				const transformationStart = movingArtefact.transformation;
				
				/* move while dragging */
				mousemove::subscribeDuringState((moveEvent) => {
					let mouseVector = moveEvent.point.in(movingArtefact.element);
					if (referencePoint && moveEvent.ctrlKey) {
						mouseVector = snap45(mouseVector, movingArtefact, referencePoint);
					}
					let translationDiff = mouseVector.minus(mousedownVector.in(movingArtefact.element));
					movingArtefact.transformation = transformationStart
						.translate(...translationDiff.xy);
				});
				
				/* stop dragging and drop */
				let initial_dragged_transformation = movingArtefact.transformation;
				let initial_dragged_parent         = movingArtefact.parent;
				mouseup
					.withLatestFrom(context.p('selected'))
					.do(([,recipient]) => {
						/* either drop it on the recipient */
						let success = false;
						if (recipient.drop::isFunction()) {
							success = recipient.drop(movingArtefact, recipient) !== false;
						}
						/* or revert to previous state if recipient rejects it */
						if (!success) {
							movingArtefact::assign({
								transformation: initial_dragged_transformation,
								parent:         initial_dragged_parent
							});
						}
						/* stop dragging */
						movingArtefact.dragging = false;
				    })
					::enterState('IDLE');
			}
		}));
		
		
		
	}
	
	
	
}

