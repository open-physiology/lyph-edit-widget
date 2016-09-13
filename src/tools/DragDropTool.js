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
import {svgPageCoordinates} from "../util/rxjs";
import {never} from "rxjs/observable/never";
import {ignoreElements} from "rxjs/operator/ignoreElements";
import {skipUntil} from "rxjs/operator/skipUntil";
import {delay} from "rxjs/operator/delay";
import {skip} from "rxjs/operator/skip";
import {subscribe_} from "../util/rxjs";
import {shiftedMMovementFor} from "../util/rxjs";
import {tap} from "../util/rxjs";
import {mapTo} from "rxjs/operator/mapTo";
import Machine from "../util/Machine";
import {emitWhenComplete} from "../util/rxjs";


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
				::filter(withoutMod('ctrl', 'shift', 'meta'))
				::tap(stopPropagation)
				::withLatestFrom(context.p('selected'))
				::filter(([,handleArtifact]) => handleArtifact.draggable)
				::map(([downEvent, movingArtefact]) => ({downEvent, movingArtefact}))
		        ::enterState('INSIDE_MOVE_THRESHOLD'),
			'INSIDE_MOVE_THRESHOLD': ({downEvent, movingArtefact}) => [
				mousemove
					::take(4)
					::ignoreElements()
					::emitWhenComplete({downEvent, movingArtefact})
					::enterState('MOVING'),
			    mouseup
				    ::enterState('IDLE')
				// TODO: go IDLE on pressing escape
			],
			'MOVING': ({downEvent, movingArtefact}) =>  {
				/* start dragging */
				movingArtefact.dragging = true;
				for (let a of movingArtefact.traverse('post')) {
					a.element.jq.mouseleave();
				}
				reassessHoveredArtefact(movingArtefact.parent);
				
				/* matrix: canvas --> moving artefact */
				const m = root.inside.getTransformToElement(movingArtefact.element);
				
				/* move while dragging */
				of(downEvent)::concat(mousemove)
					::map(event => event.point.matrixTransform(m))
					::shiftedMMovementFor(movingArtefact.transformation)
					::subscribe( movingArtefact.p('transformation') );
				
				/* stop dragging and drop */
				let initial_dragged_transformation = movingArtefact.transformation;
				let initial_dragged_parent         = movingArtefact.parent;
				mouseup
					::withLatestFrom(context.p('selected'))
					::tap(([up, recipient]) => {
						/* either drop it on the recipient */
						let success = false;
						if (recipient && recipient.drop::isFunction()) {
							success = recipient.drop(movingArtefact, recipient) !== false;
						}
						
						/* or revert to previous state if recipient rejects it */
						if (!success) {
							movingArtefact::assign({
								transformation: initial_dragged_transformation,
								parent: initial_dragged_parent
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

