import $ from 'jquery';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import BorderLine from "../artefacts/BorderLine";
import {log} from '../util/rxjs';


const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');
const $$dim  = Symbol('$$dim');
const $$updater = Symbol('$$updater');


export default class ResizeTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const {root} = context;
		
		const mousemove = fromEvent(root.element.jq, 'mousemove');
		const mouseup   = fromEvent($(window),       'mouseup'  );
		
		this.e('mousedown')
			::withLatestFrom(context.p('selected'),
				(down, selected) => down::assign({ controller: selected }))
			::filter(({controller}) => controller instanceof BorderLine)
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
            .do((down) => {
	            let lyphC = down.controller.parent;
	            lyphC.dragging = true;
	            mouseup::take(1).subscribe(() => {
		            lyphC.dragging = false;
	            });
	            let start = lyphC::pick('x', 'y', 'width', 'height');
	            switch (down.controller) {
		            case lyphC.leftBorder: { down[$$updater] = ({dx}) => ({
			            x:     start.x     + dx,
			            width: start.width - dx
		            })} break;
		            case lyphC.rightBorder: { down[$$updater] = ({dx}) => ({
                        width: start.width + dx
                    })} break;
		            case lyphC.topBorder: { down[$$updater] = ({dy}) => ({
                        y:      start.y      + dy,
                        height: start.height - dy
                    })} break;
		            case lyphC.bottomBorder: { down[$$updater] = ({dy}) => ({
                        height: start.height + dy
                    })} break;
	            } // TODO: use sw
	            down[$$xy_mousedown] = this.xy_viewport_to_canvas(down);
            })
			::switchMap(
				() => mousemove::takeUntil(mouseup),
				(down, move) => {
					let d = down[$$xy_mousedown];
					let m = this.xy_viewport_to_canvas(move);
					return ({
						controller: down.controller.parent,
						newDims: down[$$updater]({ dx: m.x - d.x, dy: m.y - d.y })
					});
				})
			.subscribe(({controller, newDims}) => {
				controller::assign(newDims);
			});
		
		
	}
	
	
	
}

