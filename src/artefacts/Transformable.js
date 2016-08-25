import {filter} from 'rxjs/operator/filter';
import {pairwise} from 'rxjs/operator/pairwise';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {map} from 'rxjs/operator/map';

import isNaN from 'lodash-bound/isNaN';

import SvgEntity from './SvgEntity.js';

import {property, flag} from '../util/ValueTracker';

import {subscribe_} from "../util/rxjs";

import {ID_MATRIX, matrixEquals, setCTM} from "../util/svg";


const $$backgroundColor       = Symbol('$$backgroundColor');
const $$toBeRecycled          = Symbol('$$toBeRecycled');
const $$recycle               = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class Transformable extends SvgEntity {
	
	@property({ initial: ID_MATRIX, isEqual: matrixEquals }) transformation;
	@property({ initial: ID_MATRIX, isEqual: matrixEquals }) canvasTransformation;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'transformation',
		    'rotation'
		]);
		
		/* set initial transformation */
		{
			let {
				width:    w = 0,
			    height:   h = 0,
                rotation: r = 0,
			    x           = 0,
			    y           = 0
			} = options;
			this.transformation = ID_MATRIX
				.translate(x, y)
				.translate(w/2, h/2)
				.rotate(r)
				.translate(-w/2, -h/2);
		}
		
		/* convert local transformation the moment it gets a new parent, */
		/* so that it will not moved w.r.t. the global coordinate system */
		this.p('parent')
			::filter(p=>p)
			::pairwise()
			::withLatestFrom(this.p('transformation'), ([prev, curr], loc) =>
							prev.inside.getTransformToElement(curr.inside).multiply(loc))
			::subscribe_( this.p('transformation'), v=>v() );
		
		/* maintain canvas-rooted transformation */
		this.p(['parent.canvasTransformation', 'transformation'], (pct, t) => pct.multiply(t))
			::subscribe_( this.p('canvasTransformation'), v=>v() );
		
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		/* enacting local transformation */
		this.element.jq.attr({ transform: '' });
		this.p('transformation')
		    .subscribe( this.element::setCTM );
	}
	
}
