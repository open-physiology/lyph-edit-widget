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


const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');
const $$dim  = Symbol('$$dim');
const $$updater = Symbol('$$updater');


export default class ResizeTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown', 'mouseenter'] });
		
		const {root} = context;
		
		const mousemove = fromEvent(root.element.jq, 'mousemove');
		const mouseup   = fromEvent($(window),       'mouseup'  );
		
		/* use the right mouse-pointer */
		this.e('mouseenter')
			::withLatestFrom(context.p('selected'))
			::filter(([,handleArtifact]) => handleArtifact instanceof BorderLine || handleArtifact instanceof CornerHandle)
			::filter(([,handleArtifact]) => handleArtifact.parent.free)
			::filter(([enter]) => !enter.mouseCursorSet)
			.subscribe(([enter, handleArtifact]) => {
				let s = handleArtifact.resizes;
				let angle = 0;
				// if (s.top)    { angle = 0 }
				// if (s.bottom) { angle = 0 }
				if (s.right)              { angle =  90 }
				if (s.left)               { angle =  90 }
				if (s.top    && s.left )  { angle = 135 }
				if (s.top    && s.right)  { angle =  45 }
				if (s.bottom && s.left )  { angle =  45 }
				if (s.bottom && s.right)  { angle = 135 }
				const m = enter.currentTarget.getScreenCTM();
				angle += Math.atan2(m[M21], m[M22]) * 180 / Math.PI;
				$(enter.currentTarget).css('cursor', [
					'ns-resize',   // 0,   0:  |
					'nesw-resize', // 1,  45:  /
					'ew-resize',   // 2,  90:  -
					'nwse-resize'  // 3, 135:  \
				][Math.floor((angle + 180/8) % 180 / (180/4)) % 4]);
				enter.mouseCursorSet = true;
			});
		
		/* allow resizing */
		this.e('mousedown')
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('selected'))
			::afterMatching(mousemove::take(4), mouseup)
			::filter(([,handleArtifact]) => handleArtifact instanceof BorderLine || handleArtifact instanceof CornerHandle)
			::filter(([,handleArtifact]) => handleArtifact.parent.free)
            .subscribe(([down, handleArtifact]) => {
            	
            	/* start resizing */
            	const resizedArtifact    = handleArtifact.parent;
	            resizedArtifact.dragging = true; // TODO: use 'resizing' instead of 'dragging'?
	            
	            /* record start dimensions */
	            const start              = resizedArtifact::pick('transformation', 'width', 'height');
	            const rootToHandleMatrix = root.element.getTransformToElement(handleArtifact.element);
	            const handleStart        = handleArtifact::pick('x', 'y');
	            
	            /* resize while dragging */
	            of(down)::concat(mousemove::takeUntil(mouseup))
		            ::map(svgPageCoordinates)
		            ::map(xy => xy.matrixTransform(rootToHandleMatrix))
		            .subscribe(({x, y}) => {
			            let width  = start.width;
			            let height = start.height;
			            let transformation = start.transformation;
			            if (handleArtifact.resizes.left) {
				            transformation = transformation.translate(x - handleStart.x, 0);
				            width -= x - handleStart.x;
			            } else if (handleArtifact.resizes.right) {
			            	width += x - handleStart.x;
			            }
			            if (handleArtifact.resizes.top) {
				            transformation = transformation.translate(0, y - handleStart.y);
				            height -= y - handleStart.y;
			            } else if (handleArtifact.resizes.bottom) {
			            	height += y - handleStart.y;
			            }
			            resizedArtifact::assign({
				            transformation,
				            width, height
			            });
		            });
	            
	            /* stop resizing */
	            mouseup::take(1).subscribe(() => {
		            resizedArtifact.dragging = false;
	            });
            });
		
		
	}
	
	
	
}

