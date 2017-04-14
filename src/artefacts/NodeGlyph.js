import chroma from '../libs/chroma.js';

import {property}    from '../util/ValueTracker.js';
import Transformable from "./Transformable";
import BorderLine    from "./BorderLine";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class NodeGlyph extends Transformable {
	
	@property({ transform: (c) => (c || 'red') }) color;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, ['color'], { draggable: true });
	}
	
	createElement() {
		const group = this.root.gElement();
		
		group.g().addClass('fixed main-shape');
		
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();

		{
			let mainShapeGroup = this.inside.svg.select('.main-shape');
			let circle = mainShapeGroup.circle().attr({
				strokeWidth: '1px',
				cx         : 0,
				cy         : 0
			});
			
			this.p('color').subscribe((color) => {
				console.log('color', color);
				circle.attr({
					stroke: chroma(color || 'red').darken(),
					fill  : chroma(color || 'red').brighten()
				});
			});
			
			// { // TODO: remove
			// 	let tooltipText = $.svg(`<title></title>`).appendTo(circle.node);
			// 	// this.p('model.name').subscribe( ::tooltipText.text );
			// 	this.p(['transformation']).map(([t])=>`(${t.a},${t.b},${t.c},${t.d},${t.e},${t.f})`).subscribe( ::tooltipText.text );
			// }
			
			this.p('parent')
				.map(p => p instanceof BorderLine ? 6 : 8)
				.map(r => ({ r }))
				.subscribe( ::circle.attr )
		}
	}
	
}
