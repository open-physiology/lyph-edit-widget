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


const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');


export default class DragDropTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const mousemove = fromEvent(context.root, 'mousemove');
		const mouseup   = fromEvent($(window), 'mouseup');
		
		this.e('mousedown')
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('selected'),
				(down, selected) => down::assign({ controller: selected }))
            .do((down) => {
            	down.controller.dragging = true;
	            mouseup::take(1).subscribe(() => {
		            down.controller.dragging = false;
	            });
	            down[$$xy_controller] = down.controller::pick('x', 'y');
	            down[$$xy_mousedown]  = this.xy_viewport_to_canvas(down);
            })
			::switchMap(
				() => mousemove::takeUntil(mouseup),
				(down, move) => {
					let c = down[$$xy_controller];
					let d = down[$$xy_mousedown];
					let m = this.xy_viewport_to_canvas(move);
					return ({
						controller: down.controller,
						xy_new: {
							x: c.x + m.x - d.x,
							y: c.y + m.y - d.y
						}
					});
				})
			.subscribe(({controller, xy_new}) => {
				controller::assign(xy_new);
			});
		
	}
	
	
	
}

