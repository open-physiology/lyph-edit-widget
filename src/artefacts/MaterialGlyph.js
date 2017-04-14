import $ from '../libs/jquery.js';

import chroma from '../libs/chroma.js';

import Transformable from "./Transformable";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class MaterialGlyph extends Transformable {
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, { draggable: true });
	}
	
	createElement() {
		
		const group = this.root.gElement();
		
		group.g().addClass('fixed main-shape');
		
		/* create a random color (one per layer, stored in the model) */
		if (!this.model[$$backgroundColor]) {
			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
		}
		
		/* return representation(s) of element */
		return { element: group.node };
		
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		/* tooltip */
		let tooltipText = $.svg(`<title></title>`).appendTo(this.element);
		this.p('model.name').subscribe( ::tooltipText.text );

		{
			let mainShapeGroup = this.inside.svg.select('.main-shape');
			mainShapeGroup.circle().attr({
				r:            20,
				strokeWidth: '1px',
				stroke:       this.model[$$backgroundColor].darken(),
				fill:         this.model[$$backgroundColor],
			});
		}
	}
	
}
