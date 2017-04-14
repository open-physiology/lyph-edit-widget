import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';

import Tool from './Tool';
import {asw, withoutMod, stopPropagation} from "../util/misc";
import BorderLine from "../artefacts/BorderLine";
import {ID_MATRIX, M11, M12, M21, M22} from "../util/svg";
import CornerHandle from "../artefacts/CornerHandle";
import {tap} from "../util/rxjs";

import {emitWhenComplete} from "../util/rxjs";

const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');
const $$dim  = Symbol('$$dim');
const $$updater = Symbol('$$updater');


export default class ResizeTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
		const mousemove = this.windowE('mousemove');
		const mouseup   = this.windowE('mouseup');
		
		context.registerCursor((handleArtifact) => {
			if (![BorderLine, CornerHandle].includes(handleArtifact.constructor)) { return false }
			if (!handleArtifact.parent.free)                                      { return false }
			let s = handleArtifact.resizes;
			let angle = 0;
			// if (s.top)             { angle =   0 }
			// if (s.bottom)          { angle =   0 }
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
		
		context.stateMachine.extend(({ enterState, subscribeDuringState }) => ({
			'IDLE': () => this.e('mousedown')
				.filter(withoutMod('ctrl', 'shift', 'meta'))
				.do(stopPropagation)
				.withLatestFrom(context.p('selected'))
				.filter(([,handleArtefact]) => handleArtefact instanceof BorderLine || handleArtefact instanceof CornerHandle)
				.filter(([,handleArtefact]) => handleArtefact.parent.free)
				.map(([downEvent, handleArtefact]) => ({
					downEvent:        downEvent,
					resizingArtefact: handleArtefact.parent,
					directions:       handleArtefact.resizes
				}))
		        ::enterState('INSIDE_RESIZE_THRESHOLD'),
			'INSIDE_RESIZE_THRESHOLD': ({downEvent, resizingArtefact, directions}) => [
				mousemove
					.take(4)
					.ignoreElements()
					::emitWhenComplete({ downEvent, resizingArtefact, directions })
					::enterState('RESIZING_RECTANGLE'),
			    mouseup
				    ::enterState('IDLE')
			    // TODO: go IDLE on pressing escape
			],
			'RESIZING_RECTANGLE': ({downEvent, resizingArtefact, directions, mouseDownIsOrigin}) => {
				/* start resizing */
				resizingArtefact.dragging = true; // TODO: use 'resizing' instead of 'dragging'?
				
				/* record start dimensions */
				const artefactStart = resizingArtefact::pick('transformation', 'width', 'height');
				const mouseStart    = downEvent.point;
				
				/* resize while dragging */
				mousemove
					.map(event => event.point.in(resizingArtefact.element).minus(mouseStart.in(resizingArtefact.element)))
					::subscribeDuringState(({x: xDiff, y: yDiff}) => {
						let width          = mouseDownIsOrigin ? 0 : artefactStart.width;
						let height         = mouseDownIsOrigin ? 0 : artefactStart.height;
						let transformation = artefactStart.transformation;
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
						width  = Math.max(width  || 0, resizingArtefact.minWidth  || 0);
						height = Math.max(height || 0, resizingArtefact.minHeight || 0);
						resizingArtefact::assign({ transformation, width, height });
					});
			
				/* stop resizing */
				mouseup
					.do(() => {
						console.log('mouseup');
						resizingArtefact.dragging = false;
					})
					::enterState('IDLE');
			}
		}));
	}
}
