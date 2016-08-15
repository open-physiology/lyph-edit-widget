import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import mapKeys from 'lodash-bound/mapKeys';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";

const $$xy_controller = Symbol('$$xy_controller');
const $$xy_mousedown  = Symbol('$$xy_mousedown');


export default class MoveTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const mousemove = fromEvent(context.root, 'mousemove');
		const mouseup   = fromEvent($(window), 'mouseup');
		
		const artefactDrag = this.e('mousedown')
			::filter(withoutMod('alt', 'ctrl', 'shift', 'meta'))
			.do(stopPropagation)
            .do((down) => {
	            down[$$xy_controller] = down.controller::pick('x', 'y');
	            down[$$xy_mousedown] = this.xy_viewport_to_canvas(down);
            })
			::mergeMap(() => mousemove::takeUntil(mouseup), (down, move) => {
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
			});
		
		artefactDrag.subscribe(({controller, xy_new}) => {
			controller::assign(xy_new);
		});
		
	}
	
	
	
}

