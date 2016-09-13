import $ from 'jquery';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {of} from 'rxjs/observable/of';
import {concat} from 'rxjs/operator/concat';
import {map} from 'rxjs/operator/map';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import isNull from 'lodash-bound/isNull';

import Tool from './Tool';
import {asw, withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import BorderLine from "../artefacts/BorderLine";
import {log} from '../util/rxjs';
import {afterMatching} from "../util/rxjs";
import {svgPageCoordinates} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {tX} from "../util/svg";
import {tY} from "../util/svg";
import {ID_MATRIX, M11, M12, M21, M22} from "../util/svg";
import CornerHandle from "../artefacts/CornerHandle";
import {tap} from "../util/rxjs";
import {ignoreElements} from "rxjs/operator/ignoreElements";
import {emitWhenComplete} from "../util/rxjs";


const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');
const $$dim  = Symbol('$$dim');
const $$updater = Symbol('$$updater');


export default class ResizeTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
		const mousemove = this.windowE('mousemove', false);
		const mouseup   = this.windowE('mouseup',   false);
		
		context.registerCursor((handleArtifact) => {
			if (![BorderLine, CornerHandle].includes(handleArtifact.constructor)) { return false }
			if (!handleArtifact.parent.free)                                      { return false }
			let s = handleArtifact.resizes;
			let angle = 0;
			// if (s.top)             { angle = 0   }
			// if (s.bottom)          { angle = 0   }
			if (s.right)              { angle =  90 }
			if (s.left)               { angle =  90 }
			if (s.top    && s.left )  { angle = 135 }
			if (s.top    && s.right)  { angle =  45 }
			if (s.bottom && s.left )  { angle =  45 }
			if (s.bottom && s.right)  { angle = 135 }
			const m = handleArtifact.handle.getScreenCTM();
			angle += Math.atan2(m[M21], m[M22]) * 180 / Math.PI;
			return [
				'ns-resize',   // 0,   0:  |
				'nesw-resize', // 1,  45:  /
				'ew-resize',   // 2,  90:  -
				'nwse-resize'  // 3, 135:  \
			][Math.floor((angle + 180/8) % 180 / (180/4)) % 4];
		});
		
		context.stateMachine.extend(({ enterState, subscribe }) => ({
			'IDLE': () => this.e('mousedown')
				::filter(withoutMod('ctrl', 'shift', 'meta'))
				::tap(stopPropagation)
				::withLatestFrom(context.p('selected'))
				::filter(([,handleArtefact]) => handleArtefact instanceof BorderLine || handleArtefact instanceof CornerHandle)
				::filter(([,handleArtefact]) => handleArtefact.parent.free)
				::map(([downEvent, handleArtefact]) => ({
					downEvent:        downEvent,
					resizingArtefact: handleArtefact.parent,
					directions:       handleArtefact.resizes
				}))
		        ::enterState('INSIDE_RESIZE_THRESHOLD'),
			'INSIDE_RESIZE_THRESHOLD': ({downEvent, resizingArtefact, directions}) => [
				mousemove
					::take(4)
					::ignoreElements()
					::emitWhenComplete({ downEvent, resizingArtefact, directions })
					::enterState('RESIZING_RECTANGLE'),
			    mouseup
				    ::enterState('IDLE')
			    // TODO: go IDLE on pressing escape
			],
			'RESIZING_RECTANGLE': ({downEvent, resizingArtefact, directions}) => {
				/* start resizing */
				resizingArtefact.dragging = true; // TODO: use 'resizing' instead of 'dragging'?
				
				/* canvas --> resizing artefact */
				const rootToHandleMatrix = root.inside.getTransformToElement(resizingArtefact.element);
				
				/* record start dimensions */
				const artefactStart = resizingArtefact::pick('transformation', 'width', 'height');
				const mouseStart    = downEvent.point.matrixTransform(rootToHandleMatrix);
				
				/* resize while dragging */
				of(downEvent)::concat(mousemove)
					::map(event => event.point.matrixTransform(rootToHandleMatrix))
					::subscribe((mouseCurrent) => {
						let width          = artefactStart.width;
						let height         = artefactStart.height;
						let transformation = artefactStart.transformation;
						let xDiff = mouseCurrent.x - mouseStart.x;
						let yDiff = mouseCurrent.y - mouseStart.y;
						if (directions.left) {
							transformation = transformation.translate(xDiff, 0);
							width -= xDiff;
						} else if (directions.right) {
							width += xDiff;
						}
						if (directions.top) {
							transformation = transformation.translate(0, yDiff);
							height -= yDiff;
						} else if (directions.bottom) {
							height += yDiff;
						}
						resizingArtefact::assign({
							transformation,
							width, height
						});
					});
				
				/* stop resizing */
				mouseup
					::tap(() => { resizingArtefact.dragging = false })
					::enterState('IDLE');
			}
		}));
	}
	
	
	
}

