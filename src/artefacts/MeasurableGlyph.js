import $          from '../libs/jquery.js';

import {ID_MATRIX} from "../util/svg";

import Transformable from "./Transformable";
import ProcessLine from "./ProcessLine";
import {setCTM} from "../util/svg";
import BorderLine from "./BorderLine";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class MeasurableGlyph extends Transformable {
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, { draggable: true });
	}
	
	createElement() {
		
		const group = this.root.gElement();
		
		group.g().addClass('fixed main-shape');
		
		/* return representation(s) of element */
		return { element: group.node };
		
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		/* tooltip */
		let tooltipText = $.svg(`<title></title>`).appendTo(this.element);
		this.p('model.name').subscribe( ::tooltipText.text );
		
		/* drawing a polygon */
		const POLY_POINTS = [
			 30,   0,
			 15,  26,
			-15,  26,
			-30,   0,
			-15, -26,
			 15, -26
		];

		{
			let mainShapeGroup = this.inside.svg.select('.main-shape');
			let polygon = mainShapeGroup.polygon(POLY_POINTS.map(p=>p/2.5)).attr({
				strokeWidth: '1px',
				stroke:      '#111111',
				fill:        '#dddddd'
			});
			
			this.p('parent')
				.map(p => p instanceof ProcessLine || p instanceof BorderLine ? 0.75 : 1)
				.map(f => ID_MATRIX.scale(f))
				.subscribe( polygon.node::setCTM );
			
		}
	}
	
	// drop(droppedEntity) {
	// 	// TODO
	// }
	
}
