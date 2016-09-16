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
import ProcessLine from "./ProcessLine";
import {setCTM} from "../util/svg";
import BorderLine from "./BorderLine";

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
