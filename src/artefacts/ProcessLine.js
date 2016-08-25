import SvgEntity from './SvgEntity.js';
import {property} from '../util/ValueTracker.js';
import {tX} from "../util/svg";
import {tY} from "../util/svg";
import {map} from "rxjs/operator/map";
import {merge} from "rxjs/observable/merge";


const $$backgroundColor = Symbol('$$backgroundColor');


export default class ProcessLine extends SvgEntity {
	
	@property() source;
	@property() target;
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'source', 'target'
		], { free: false });
	}
	
	createElement() {
		const group = this.root.gElement();
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		const group = this.inside.svg;
		
		let line = group.line().attr({
			strokeWidth  : '3px',
			stroke       : 'red',
			pointerEvents: 'none',
			strokeLinecap: 'round'
		});
		
		merge(
			this.p('source.canvasTransformation')::map(ctm => ({ x1: ctm[tX], y1: ctm[tY] })),
			this.p('target.canvasTransformation')::map(ctm => ({ x2: ctm[tX], y2: ctm[tY] }))
		).subscribe( ::line.attr );
	}
	
	drop(droppedEntity) {
		// TODO
	}
	
	
}
