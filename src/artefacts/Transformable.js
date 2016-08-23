import $          from '../libs/jquery.js';
import Snap, {gElement} from '../libs/snap.svg';

import pick     from 'lodash-bound/pick';
import defaults from 'lodash-bound/defaults';
import isNumber from 'lodash-bound/isNumber';
import size from 'lodash-bound/size';
import at from 'lodash-bound/at';
import assign from 'lodash-bound/assign';
import sortBy from 'lodash-bound/sortBy';
import maxBy from 'lodash-bound/maxBy';
import max from 'lodash-bound/max';
import min from 'lodash-bound/min';
import ldMap from 'lodash-bound/map';
import find from 'lodash-bound/find';
import entries from 'lodash-bound/entries';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _add from 'lodash/add';
import _defer from 'lodash/defer';
import _zip from 'lodash/zip';

import uniqueId from 'lodash/uniqueId';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';

// import {map} from '../util/bound-hybrid-functions';

import {merge} from 'rxjs/observable/merge';
import {range} from 'rxjs/observable/range';
import {interval} from 'rxjs/observable/interval';

import {sampleTime} from 'rxjs/operator/sampleTime';
import {filter} from 'rxjs/operator/filter';
import {pairwise} from 'rxjs/operator/pairwise';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {switchMap} from 'rxjs/operator/switchMap';
import {toPromise} from 'rxjs/operator/toPromise';
import {concat} from 'rxjs/operator/concat';
import {map} from 'rxjs/operator/map';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import BorderLine from './BorderLine';

import {subscribe_} from "../util/rxjs";
import {shiftedMovementFor, log} from "../util/rxjs";
import {flag} from "../util/ValueTracker";
import NodeGlyph from "./NodeGlyph";

import almostEqual from 'almost-equal';
import {ID_MATRIX} from "../util/svg";
import {createSVGTransformFromMatrix} from "../util/svg";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');

function matrixEquals(M1, M2) {
	return ['a', 'b', 'c', 'd', 'e', 'f'].every(key => almostEqual(M1[key], M2[key]));
}

export default class Transformable extends SvgEntity {
	
	@flag(true) transformable;
	
	@property({ initial: ID_MATRIX, isEqual: matrixEquals }) transformation;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [], { showAxis: !!this.model.axis });
		
		this.transformation = ID_MATRIX
			.translate(options.width/2, options.height/2)
			.rotate(options.rotation || 0)
			.translate(-options.width/2, -options.height/2)
			.translate(options.x || 0, options.y || 0);
		
		
		/* convert local transformation the moment it gets a new parent, */
		/* so that it will not moved w.r.t. the global coordinate system */
		this.p('parent')
			::filter(p=>p)
			::pairwise()
			::map(([prev, curr]) => prev.element.getTransformToElement(curr.element))
			::withLatestFrom(this.p('transformation'), (tr, loc) => loc.multiply(tr))
			::subscribe_( this.p('transformation'), v=>v() );
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		/* enacting local transformation */
		this.element.jq.attr({ transform: '' });
		this.p('transformation')
		    ::map(createSVGTransformFromMatrix)
		    .subscribe( ::this.element.transform.baseVal.initialize );
	}
	
	get draggable() { return this.transformable }
	
}
