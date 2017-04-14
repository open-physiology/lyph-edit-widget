import {Observable} from '../libs/rxjs.js';
import SvgEntity from './SvgEntity.js';
import {property} from '../util/ValueTracker.js';
import {tX} from "../util/svg";
import {tY} from "../util/svg";


const $$backgroundColor = Symbol('$$backgroundColor');


export default class CausalityArrow extends SvgEntity {
	
	@property() cause;
	@property() effect;
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'cause', 'effect'
		], { free: false });
	}
	
	createElement() {
		const group = this.root.gElement();
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		const group = this.inside.svg;
		
		var arrow = group.polygon([0,0 , -4,-2 , -4,2 , 0,0]).attr({fill: 'gray'});
		var marker = arrow.marker(-8,-4, 8,8, -2,0);
		
		let line = group.line().attr({
			strokeWidth  : '3px',
			stroke       : 'gray',
			pointerEvents: 'none',
			strokeLinecap: 'round',
			markerEnd: marker
		});
		
		Observable.merge(
			this.p('cause.canvasTransformation' ).map(ctm => ({ x1: ctm[tX], y1: ctm[tY] })),
			this.p('effect.canvasTransformation').map(ctm => ({ x2: ctm[tX], y2: ctm[tY] }))
		).subscribe( ::line.attr );
	}
	
	drop(droppedEntity) {
		// TODO
	}
	
	
}
