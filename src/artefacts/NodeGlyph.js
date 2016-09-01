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

import {interval} from 'rxjs/observable/interval';
import {of} from 'rxjs/observable/of';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operator/map';
import {take} from 'rxjs/operator/take';
import {switchMap} from 'rxjs/operator/switchMap';
import {sampleTime} from 'rxjs/operator/sampleTime';

import {ID_MATRIX} from "../util/svg";


import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import {flag} from "../util/ValueTracker";
import {subscribe_} from "../util/rxjs";
import Transformable from "./Transformable";
import BorderLine from "./BorderLine";
import {setCTM} from "../util/svg";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class NodeGlyph extends Transformable {
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, { draggable: true });
	}
	
	createElement() {
		const group = this.root.gElement();
		
		group.g().addClass('main-shape');
		
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();

		{
			let mainShapeGroup = this.inside.svg.select('.main-shape');
			let circle = mainShapeGroup.circle().attr({
				strokeWidth: '1px',
				stroke     : '#aa0000',
				fill       : '#ff5555',
				cx         : 0,
				cy         : 0
			});
			
			// { // TODO: remove
			// 	let tooltipText = $.svg(`<title></title>`).appendTo(circle.node);
			// 	// this.p('model.name').subscribe( ::tooltipText.text );
			// 	this.p(['transformation'])::map(([t])=>`(${t.a},${t.b},${t.c},${t.d},${t.e},${t.f})`).subscribe( ::tooltipText.text );
			// }
			
			this.p('parent')
				::map(p => p instanceof BorderLine ? 6 : 8)
				::map(r => ({ r }))
				.subscribe( ::circle.attr )
		}
	}
	
	// drop(droppedEntity) {
	// 	// TODO
	// }
	
}
