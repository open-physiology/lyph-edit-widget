import {filter} from 'rxjs/operator/filter';
import {pairwise} from 'rxjs/operator/pairwise';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {map} from 'rxjs/operator/map';

import isNaN from 'lodash-bound/isNaN';

import SvgEntity from './SvgEntity.js';

import {property, event, flag} from '../util/ValueTracker';

import {subscribe_} from "../util/rxjs";

import {ID_MATRIX, matrixEquals, setCTM} from "../util/svg";
import {merge} from "rxjs/observable/merge";
import {of} from "rxjs/observable/of";
import {mapTo} from "rxjs/operator/mapTo";
import {combineLatest} from "rxjs/observable/combineLatest";
import {sample} from "rxjs/operator/sample";
import {sampleTime} from "rxjs/operator/sampleTime";


const $$backgroundColor       = Symbol('$$backgroundColor');
const $$toBeRecycled          = Symbol('$$toBeRecycled');
const $$recycle               = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class Transformable extends SvgEntity {
	
	@property({ initial: ID_MATRIX, isEqual: matrixEquals }) transformation;
	@property({ initial: ID_MATRIX, isEqual: matrixEquals }) canvasTransformation;
	
	@property({ initial: null, isEqual: ()=>false }) positionChange;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'transformation',
		    'rotation'
		]);
		
		/* set initial transformation */
		if (!options.transformation) {
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
		
		// /* maintain sampledTransformation */
		// this.p('transformation')::sampleTime(1000/60).subscribe( this.pSubject('sampledTransformation'));
		
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		/* enacting local transformation */
		this.p('transformation').subscribe( this.element::setCTM );
		
		/* maintain canvas-rooted transformation */
		this.p(['parent?.canvasTransformation', 'transformation'], (pct, t) => (pct || ID_MATRIX).multiply(t))
		    .subscribe( this.p('canvasTransformation') );
		
		/* just send a signal whenever this element changes position w.r.t. the canvas */
		// NOTE: this code has to appear after "enacting local transformation",
		//       so that subscribers can count on things like 'getTransformToElement'
		let posChangeSignals = [];
		for (let art = this; !art.isRoot(); art = art.parent) {
			posChangeSignals.push(art.p('transformation')::mapTo(null));
		}
		merge(...posChangeSignals).subscribe( this.p('positionChange') );
	}
	
}
