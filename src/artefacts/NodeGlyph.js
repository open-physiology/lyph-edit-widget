import $          from '../libs/jquery.js';

import pick     from 'lodash-bound/pick';
import defaults from 'lodash-bound/defaults';
import isNumber from 'lodash-bound/isNumber';
import size from 'lodash-bound/size';
import at from 'lodash-bound/at';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _defer from 'lodash/defer'

import uniqueId from 'lodash/uniqueId';

// TODO: no longer need to import: interval;
// TODO: no longer need to import: of;

// TODO: no longer need to import: combineLatest;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: switchMap;
// TODO: make sure we don't need to import: sampleTime;

import {ID_MATRIX, refSnap} from "../util/svg";


import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import {flag} from "../util/ValueTracker";
import {subscribe_} from "../util/rxjs";
import Transformable from "./Transformable";
import BorderLine from "./BorderLine";
import {setCTM} from "../util/svg";
import {enrichDOM} from "../util/misc";

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
