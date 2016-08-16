import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {fromEventPattern} from 'rxjs/observable/fromEventPattern';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {map} from 'rxjs/operator/map';
import {scan} from 'rxjs/operator/scan';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {xy_add} from "../util/misc";


const $$panTools = Symbol('$$panTools');
const $$xy_initialPan  = Symbol('$$xy_initialPan');

export default class PanTool extends Tool {
	
	constructor(context) {
		super(context, { events: [] });
		
		let {root, paper} = context;
		
		if (!context[$$panTools]) {
			
			context[$$panTools] = true;
		
			window.E = ""; // <-- ugly hack to fix snap.svg.zpd bug
			
			context.newProperty('pan', { initial: { x: 0, y: 0 } });
			
			/* manifest pan on the canvas */
			context.p('pan').subscribe(({x, y}) => { paper.panTo(x, y) });
			
		}
		
		/* relevant mouse-event streams */
		const mousedown = fromEvent(context.root, 'mousedown');
		const mousemove = fromEvent(context.root, 'mousemove');
		const mouseup   = fromEvent($(window),    'mouseup'  );
		
		/* maintaining pan */
		const canvasDrag = mousedown
			::filter(withoutMod('alt', 'ctrl', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('pan'))
			::switchMap(() => mousemove::takeUntil(mouseup), ([d, i], m) => ({
				x: i.x + m.pageX - d.pageX,
				y: i.y + m.pageY - d.pageY
			}))
			.subscribe( context.p('pan') );
		
	}
	
}
