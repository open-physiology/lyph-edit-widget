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


export default class DragDropTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
		const mousemove = this.windowE('mousemove', false);
		const mouseup   = this.windowE('mouseup', false  );
		
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
		
		this.e('mousedown', false)
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('selected'))
			::afterMatching(mousemove::take(4), mouseup)
			::filter(([,handleArtifact]) => handleArtifact.draggable)
			.subscribe(([down, draggedArtefact]) => {
				
				function reassessMouseHover(a) {
					if (!a){ return }
					a.element.jq.mouseleave();
					reassessMouseHover(a.parent);
					if (a.element.jq.is(':hover')) {
						a.element.jq.mouseenter();
					}
				}
								
				/* start dragging */
				draggedArtefact.dragging = true;
				for (let a of draggedArtefact.traverse('post')) {
					a.element.jq.mouseleave();
				}
				reassessMouseHover(draggedArtefact.parent);
				
				
				// let offset = root.element.jq.offset();
				const startMatrix = root.element.getTransformToElement(draggedArtefact.element);//.translate(offset.left, offset.top);
				
				
				/* move while dragging */
				of(down)::concat(mousemove::takeUntil(mouseup))
					// ::map(::this.xy_page_to_viewport) // not needed, because we're interested in the delta
					::map(svgPageCoordinates)
					::map(xy => xy.matrixTransform(startMatrix))
					::shiftedMatrixMovementFor(draggedArtefact.p('transformation'))
					.subscribe((m) => {
						draggedArtefact.transformation = m;
					});
				
				/* stop dragging and drop */
				let initial_dragged_transformation = draggedArtefact.transformation;
				let initial_dragged_parent         = draggedArtefact.parent;
				mouseup::withLatestFrom(context.p('selected'))::take(1)
					.subscribe(([up, recipient]) => {
						
						/* either drop it on the recipient */
						let success = false;
						if (recipient && recipient.drop::isFunction()) {
							success = recipient.drop(draggedArtefact, recipient) !== false;
						}
						/* or revert to previous state if recipient rejects it */
						if (!success) {
							draggedArtefact::assign({
								transformation: initial_dragged_transformation,
								parent: initial_dragged_parent
							});
						}
						
						/* stop dragging */
						draggedArtefact.dragging = false;
				    });
				
			});
		
	}
	
	
	
}

