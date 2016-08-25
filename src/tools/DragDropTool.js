import $ from 'jquery';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {of} from 'rxjs/observable/of';
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
import {shiftedMovementFor} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {POINT} from "../util/svg";
import {svgPageCoordinates} from "../util/rxjs";
import {combineLatest} from "rxjs/observable/combineLatest";


export default class DragDropTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
		const mousemove = fromEvent($(window), 'mousemove');
		const mouseup   = fromEvent($(window), 'mouseup'  );
		
		// /* use the right mouse-pointer */
		// combineLatest(
		// 	this.e('mouseenter'),
		// 	context.p('selected')
		// )
		// 	::filter(([,handleArtifact]) => handleArtifact.draggable)
		// 	::filter(([enter]) => !enter.mouseCursorSet)
		// 	.subscribe(([enter, handleArtifact]) => {
		// 		$(enter.currentTarget).css('cursor', 'grab');
		// 		enter.mouseCursorSet = true;
		// 	});
		
		
		this.e('mousedown')
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('selected'))
			::afterMatching(mousemove::take(4), mouseup)
			::filter(([,draggedArtefact]) => draggedArtefact.draggable)
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
				
				
				const startMatrix = root.element.getTransformToElement(draggedArtefact.element);
				
				
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

