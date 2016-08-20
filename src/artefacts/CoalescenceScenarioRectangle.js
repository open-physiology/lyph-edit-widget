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
import ldMap from 'lodash-bound/map';

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
import LyphRectangle from "./LyphRectangle";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class CoalescenceScenarioRectangle extends SvgEntity {

	@flag(true) free;

	@property({ isValid: _isNumber                                        }) x;
	@property({ isValid: _isNumber                                        }) y;
	@property({ isValid(w) { return w::isNumber() && w > this.minWidth  } }) width;
	@property({ isValid(h) { return h::isNumber() && h > this.minHeight } }) height;
	@property({ isValid(r) { return r::isNumber() }, initial: 0           }) rotation;


	@property({ initial: Snap.matrix() }) gTransform; // local --> global


	get axisThickness() { return this.model.axis && this.showAxis ? 14 : 0 }

	get minHeight() { return 2 * ((this.axisThickness && this.showAxis) + 1) }

	get minWidth() {
		return (this.axisThickness * 2) + (this.model ? 3 * 2 * 2 : 5); // TODO: fix
	}

	lyphs  = new ObservableSet();
	@property() leftLyph;
	@property() rightLyph;
	layers = new ObservableSet(); // synced with lyphs


	constructor(options) {
		super(options);

		this.setFromObject(options, [
			'x', 'y', 'width', 'height', 'rotation', 'lyphs'
		]);

		this[$$toBeRecycled] = new WeakMap();

		this.lyphs.e('add')::subscribe_( this.children.e('add') , n=>n() );
		this.children.e('delete')::subscribe_( this.lyphs.e('delete') , n=>n() );
	}

	createElement() {
		const at = this.axisThickness;
		const group = this.root.gElement();
		
		this.p(['rotation', 'x', 'y', 'width', 'height'],
				(r, x, y, w, h) => `R${r},${x+w/2},${y+h/2}`)
		    .subscribe( ::group.transform );
		
		group.g().addClass('leftLyph');
		group.g().addClass('rightLyph');
		
		/* return representation(s) of element */
		return { element: group.node };
	}

	[$$recycle](model) {
		if (!this[$$toBeRecycled].has(model)) { return false }
		let result = this[$$toBeRecycled].get(model);
		this[$$toBeRecycled].delete(model);
		return result;
	}

	async afterCreateElement() {
		await super.afterCreateElement();


		combineLatest(
			this.p('parent')::switchMap(p=>p?p.p('gTransform'):of(0)),
			this.p('rotation'),
			this.p('x'), this.p('y'),
			this.p('width'), this.p('height')
		)
			// ::sampleTime(1000/30)
			::map(()=>this.element.svg.transform().globalMatrix)
			::subscribe_( this.p('gTransform'), v=>v() );


		
		/* new layer in the model --> new layer artifact */
		this[$$relativeLayerPosition] = new WeakMap();
		this.model.lyphs.e('add')
			::map((lyph) => this[$$recycle](lyph) || new LyphRectangle({
				parent  : this,
				model   : lyph,
				showAxis: true,
				free    : false
			}))
			.subscribe((lyphRectangle) => {
				if (!this.leftLyph) {
					this.leftLyph  = lyphRectangle;
				} else if (!this.rightLyph) {
					this.rightLyph = lyphRectangle;
				}
			});

		/* new lyph artifact --> house svg element */
		combineLatest(
			this.p('leftLyph')::filter(l=>l),
			this.p('rightLyph')::filter(l=>l)
		).subscribe(([leftLyph, rightLyph]) => {
			leftLyph.rotation = -90;
			this.inside.jq.children('.leftLyph').append(leftLyph.element);
			const leftLyphRemoved = leftLyph.p('parent')::filter(parent=>parent!==this);
			leftLyphRemoved.subscribe(() => {
				if (leftLyph.element.jq.parent()[0] === this.element) {
					leftLyph.element.jq.remove();
				}
			});
			
			rightLyph.rotation = 90;
			this.inside.jq.children('.rightLyph').append(rightLyph.element);
			const rightLyphRemoved = rightLyph.p('parent')::filter(parent=>parent!==this);
			rightLyphRemoved.subscribe(() => {
				if (rightLyph.element.jq.parent()[0] === this.element) {
					rightLyph.element.jq.remove();
				}
			});
			
			combineLatest(
				this.pObj(['x', 'y', 'width', 'height']),
				leftLyph.layers.p('value')::filter(l=>l.size > 0),
				rightLyph.layers.p('value')::filter(l=>l.size > 0)
			)::log('(3)').subscribe(([{x, y, width, height}, leftLayers, rightLayers]) => {
				console.log('(4)', [{x, y, width, height}, leftLayers, rightLayers]);
				let layerCount = leftLayers.size + rightLayers.size - 1;
				let layerWidth = (width - leftLyph.axisThickness - rightLyph.axisThickness) / layerCount;
				console.log('(5)', layerCount, layerWidth);
				leftLyph::assign({
					width,
					height: leftLyph.axisThickness + layerWidth * leftLayers.size,
					x: x,
					y: y
				});
				rightLyph::assign({
					width,
					height: rightLyph.axisThickness + layerWidth * rightLayers.size,
					x: leftLyph.axisThickness + layerWidth * (leftLayers.size-1),
					y: y
				});
			});
		});
	}

	get draggable() { return true }

	// drop(droppedEntity, originalDropzone = this) {
	// 	if (originalDropzone === this) {
	// 		// dropped directly into this lyph rectangle
	// 		if ([LyphRectangle, NodeGlyph].includes(droppedEntity.constructor)) {
	// 			this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
	// 			this.freeFloatingStuff.add(droppedEntity, { force: true });
	// 		} else {
	// 			return false;
	// 		}
	// 	} else if (this.longitudinalBorders.has(originalDropzone)) {
	// 		// dropped onto longitudinal border (to become layer)
	// 		if ([LyphRectangle].includes(droppedEntity.constructor)) {
	// 			let newPosition = [...this.model['-->HasLayer']]
	// 				::ldMap('relativePosition')
	// 				::max() + 1;
	// 			this.model.layers.delete(droppedEntity.model);
	// 			this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
	// 			window.module.classes.HasLayer.new({
	// 				[1]: this.model,
	// 				[2]: droppedEntity.model,
	// 				relativePosition: newPosition
	// 			});
	// 			// this.layers.add(droppedEntity, { force: true });
	// 		} else {
	// 			return false;
	// 		}
	// 		// TODO: dropped on border (also put code in border class)
	// 	}
	// }

}
