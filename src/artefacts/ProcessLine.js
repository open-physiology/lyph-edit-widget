import SvgEntity from './SvgEntity.js';
import {property} from '../util/ValueTracker.js';
import {tX} from "../util/svg";
import {tY} from "../util/svg";
import {log} from "../util/rxjs";
import {map} from "rxjs/operator/map";
import {merge} from "rxjs/observable/merge";
import {closestCommonAncestor} from "./SvgEntity";
import {filter} from "rxjs/operator/filter";


const $$backgroundColor = Symbol('$$backgroundColor');


export default class ProcessLine extends SvgEntity {
	
	@property() source;
	@property() target;
	@property({ initial: 'red' }) color;
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'source', 'target', 'color'
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
			pointerEvents: 'none',
			strokeLinecap: 'round'
		});
		
		this.p('color')::map(c => ({ stroke: c })).subscribe( ::line.attr );
		
		this.p(['source.parent', 'target.parent'])
			::log('(sp, tp)')
			::filter(([sp, tp]) => !!sp && !!tp)
			::log('(sp, tp)')
			::map(([sp, tp]) => closestCommonAncestor(sp, tp))
			::log('(cca)')
			.subscribe(this.p('parent'));
			// .subscribe((cca) => { this.parent = cca });
		
		merge(
			this.p(['source.canvasTransformation', 'parent'])
				::map(([ctm, parent]) => this.root.inside.getTransformToElement(parent.inside).multiply(ctm))
				::map(ctm => ({ x1: ctm[tX], y1: ctm[tY] })),
			this.p(['target.canvasTransformation', 'parent'])
				::map(([ctm, parent]) => this.root.inside.getTransformToElement(parent.inside).multiply(ctm))
				::map(ctm => ({ x2: ctm[tX], y2: ctm[tY] }))
		).subscribe( ::line.attr );
	}
	
	drop(droppedEntity) {
		// TODO
	}
	
}
