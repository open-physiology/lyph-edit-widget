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
import Transformable from "./Transformable";
import {ID_MATRIX} from "../util/svg";
import CornerHandle from "./CornerHandle";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class LyphRectangle extends Transformable {
	
	@flag(true) free;
	
	@property({ isValid: _isNumber }) width;
	@property({ isValid: _isNumber }) height;
	
	get axisThickness() { return this.model.axis && this.showAxis ? 14 : 0 }
	
	get minWidth() { return 2 * ((this.axisThickness && this.showAxis) + 1) }
	
	get minHeight() { return (this.axisThickness && this.showAxis) + (this.model ? this.model.layers::size() * 2 : 5) }
	
	segments            = new ObservableSet();
	layers              = new ObservableSet();
	
	freeFloatingStuff   = new ObservableSet();
	
	radialBorders       = new ObservableSet();
	longitudinalBorders = new ObservableSet();
	
	@property() leftBorder;
	@property() rightBorder;
	@property() topBorder;
	@property() bottomBorder;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'width',
			'height'
		], { showAxis: !!this.model.axis });
		
		this[$$toBeRecycled] = new WeakMap();
		
		/* create the border artifacts */
		for (let setKey of ['radialBorders', 'longitudinalBorders']) {
			this.model[setKey].e('add')::map(border => this[$$recycle](border) || new BorderLine({
				parent : this,
				model  : border,
				movable: this.free
			}))::subscribe_( this[setKey].e('add') , n=>n() );
		}
		
		for (let setKey of [
			'layers',
			'segments',
			'radialBorders',
			'longitudinalBorders'
		]) {
			this[setKey].e('add')::subscribe_( this.children.e('add') , n=>n() );
			this.children.e('delete')::subscribe_( this[setKey].e('delete') , n=>n() );
		}
		
		/* create a random color (one per layer, stored in the model) */
		if (!this.model[$$backgroundColor]) {
			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
		}
		
	}
	
	createElement() {
		const at = this.axisThickness;
		const group = this.root.gElement();
				
		const lyphRectangle = (() => {
			
			let shadow = group.rect().attr({
				filter: this.root.paper.filter(Snap.filter.shadow(8, 8, 4, '#111111', 0.4)),
			});
			this.p(['free', 'dragging']).subscribe(([f, d]) => {
				shadow.attr({ visibility: (f && d ? 'visible' : 'hidden') })
			});
			
			let result = group.rect().attr({
				stroke        : 'none',
				fill          : this.model[$$backgroundColor],
				shapeRendering: 'crispEdges'
			});
			
			this.p('width').subscribe(width  => {
				result.attr({ width });
				shadow.attr({ width });
			});
			this.p('height').subscribe(height => {
				result.attr({ height });
				shadow.attr({ height });
			});
			
		})();
		
		const highlightedBorder = (() => {
			// let result = this.root.g().attr({
			// 	pointerEvents : 'none'
			// });
			let result = group.g().attr({
				pointerEvents : 'none'
			});
			
			result.rect().attr({
				stroke:      'black',
				strokeWidth: '3px',
				x: -4,
				y: -4
			});
			result.rect().attr({
				stroke:      'white',
				strokeWidth: '1px',
				x: -4,
				y: -4
			});
			let rects = result.selectAll('rect').attr({
				fill:            'none',
				shapeRendering:  'crispEdges',
				pointerEvents :  'none',
				strokeDasharray: '8, 5', // 13
				strokeDashoffset: 0
			});
			
			/* animate selection border */
			interval(1000/60)
				::map(n => ({ strokeDashoffset: -(n / 3 % 13) }))
				.subscribe( ::rects.attr );
			
			
			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
				visibility: highlighted && !dragging ? 'visible' : 'hidden'
			})).subscribe( ::result.attr );
			
			this.p('width') .subscribe((width)  => { rects.attr({ width:  width+7  }) });
			this.p('height').subscribe((height) => { rects.attr({ height: height+7 }) });
			
			// $('#foreground').append(result.node);
			
			return result.node;
		})();
		
		const axis = (() => {
			
			if (!this.showAxis) { return null }
			
			const result = group.g().addClass('axis').attr({
				pointerEvents: 'none'
			});
			
			const background = result.rect().attr({
				stroke        : 'black',
				fill          : 'black',
				shapeRendering: 'crispEdges',
				height        : at,
				x             : 0
			});
			this.p('height').subscribe(height => background.attr({ y: height - at }));
			this.p('width').subscribe(width => background.attr({ width }));
			
			const clipPath = result.rect().addClass('axis-clip-path').attr({
				height: at,
				x:      at
			});
			const minusText = result.text().attr({
				textAnchor: 'middle',
				x:           at / 2
			});
			minusText.node.innerHTML='&minus;';
			const labelText = result.text().attr({
				textAnchor: 'middle',
				clip:        clipPath
			});
			const plusText = result.text().attr({
				text:       '+',
				textAnchor: 'middle'
			});
			const allText = group.selectAll('text').attr({
				fill            : 'white',
				fontSize        : `${at}px`,
				textRendering   : 'geometricPrecision',
				pointerEvents   : 'none',
				dominantBaseline: 'central',
			});
			
			this.p('width').subscribe((width) => {
				clipPath.attr({ width: width - 2*at });
				labelText.attr({ x: width/2 });
				plusText.attr({ x: width - at/2 });
			});
			
			this.p('height').subscribe((height) => {
				allText .attr({ y: height - at/2 });
				clipPath.attr({ y: height - at   });
			});
			
			this.model.p('name')::map(n=>({ text: n })).subscribe( ::labelText.attr );
			
			return result;
			
		})();
		
		
		group.g().addClass('parts');
		group.g().addClass('layers');
		group.g().addClass('segments'); // TODO: segments
		

		const borderGroup = (() => {
			const result = group.g().addClass('borders');
			
			this.leftBorder  = null;
			this.rightBorder = null;
			this.radialBorders.e('add').subscribe((borderLine) => {
				const removed = this.radialBorders.e('delete')::filter(b=>b===borderLine);
				result.append(borderLine.element.svg);
				removed.subscribe(() => { borderLine.element.remove() });
				borderLine.y1 = 0;
				this.p('height')::subscribe_( borderLine.p('y2') , n=>n() );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					borderLine.resizes = { left: true };
					borderLine.x = 0;
					removed.subscribe(() => { this.leftBorder = null });
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					borderLine.resizes = { right: true };
					this.p('width')::subscribe_( borderLine.p('x') , n=>n() );
					removed.subscribe(() => { this.rightBorder = null });
				} else {
					throw new Error('Trying to add a third radial border.');
				}
			});
			
			this.topBorder    = null;
			this.bottomBorder = null; // also axis
			this.longitudinalBorders.e('add').subscribe((borderLine) => {
				const removed = this.longitudinalBorders.e('delete')::filter(b=>b===borderLine);
				result.append(borderLine.element.svg);
				removed.subscribe(() => { borderLine.element.remove() });
				borderLine.x1 = 0;
				this.p('width')::subscribe_( borderLine.p('x2') , n=>n() );
				if (!this.topBorder) {
					this.topBorder = borderLine;
					borderLine.resizes = { top: true };
					borderLine.y = 0;
					removed.subscribe(() => { this.topBorder = null });
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					borderLine.resizes = { bottom: true };
					this.p('height')::subscribe_( borderLine.p('y') , n=>n() );
					removed.subscribe(() => { this.bottomBorder = this.axis = null });
				}
			});
			
		})();
		
		group.g().addClass('corners');
		group.g().addClass('nodes');
		
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
		
		
		
			
		/* corner resize handles */
		this.corners = {};
		for (let [c, resizes] of [
			['tl', { top:    true, left:  true }],
			['tr', { top:    true, right: true }],
			['bl', { bottom: true, left:  true }],
			['br', { bottom: true, right: true }]
		]) {
			this.corners[c] = new CornerHandle({ parent: this, movable: this.free, resizes });
			this.inside.jq.children('.corners').append(this.corners[c].element);
		}
		this.corners.tl::assign({ x: 0, y: 0});
		this.corners.tr::assign({ y: 0 });
		this.corners.bl::assign({ x: 0 });
		this.p(['width', 'height']).subscribe(([w, h]) => {
			this.corners.tr::assign({ x: w });
			this.corners.bl::assign({ y: h });
			this.corners.br::assign({ x: w, y: h});
		});
		
		
		
		/* new layer in the model --> new layer artifact */
		this[$$relativeLayerPosition] = new WeakMap();
		this.model['-->HasLayer'].e('add').subscribe((rel) => {
			const removed = this.model['-->HasLayer'].e('delete')::filter(r=>r===rel);
			let layerBox = this[$$recycle](rel[2]) || new LyphRectangle({
				parent  : this,
				model   : rel[2],
				showAxis: false,
				free    : false
			});
			this[$$relativeLayerPosition].set(layerBox, rel.p('relativePosition')::takeUntil(removed));
			this.layers.add(layerBox);
		});
		
		/* new layer artifact --> house svg element */
		this.layers.e('add').subscribe((layer) => {
			this.inside.jq.children('.layers').append(layer.element);
			const removed = layer.p('parent')::filter(parent=>parent!==this);
			
			this.leftBorder.model.p('nature')
				::takeUntil(removed)
				::subscribe_( layer.leftBorder.model.p('nature'), v=>v() );
			this.rightBorder.model.p('nature')
				::takeUntil(removed)
				::subscribe_( layer.rightBorder.model.p('nature'), v=>v() );
			
			removed.subscribe(() => {
				if (layer.element.jq.parent()[0] === this.element) {
					layer.element.jq.remove();
				}
			});
		});
		
		/* layer artifact set changed --> refresh layer order */
		this.layers.p('value')
			::map(layers => [...layers])
			::map(layers => ({
				dimensions:        this.pObj(['width', 'height']),
				layers:            layers,
				relativePositions: layers.map(::this[$$relativeLayerPosition].get)
			}))
			::switchMap(
				({dimensions, relativePositions}) =>
					combineLatest(dimensions, ...relativePositions),
				({layers}, [{width, height}, ...relativePositions]) => ({
					layers: layers::sortBy(l => -relativePositions[layers.indexOf(l)]),
					width:   width,
					height: (height - this.axisThickness) / layers.length
				}))
			.subscribe(({layers, width, height} ) => {
				for (let i = 0; i < layers.length; ++i) {
					layers[i]::assign({
						parent: this
					}, {
						width,
						height,
						transformation: ID_MATRIX.translate(0, i * height)
					});
				}
			});
		
		
		this.freeFloatingStuff.e('add')::subscribe_( this.children.e('add') , n=>n() );
		this.children.e('delete')::subscribe_( this.freeFloatingStuff.e('delete') , n=>n() );
		this.syncModelWithArtefact(
			'HasPart',
			LyphRectangle,
			this.inside.jq.children('.parts'),
			({model, width, height}) => new LyphRectangle({
				model,
				x:      5,          // TODO: pick unique new position and size (auto-layout)
				y:      5,          //
				width:  width  / 2, //
				height: height / 2  //
			})
		);
		
		this.syncModelWithArtefact(
			'ContainsNode',
			NodeGlyph,
			this.inside.jq.children('.nodes'),
			({model, width, height}) => new NodeGlyph({
				model,
				x: width  - 13, // TODO: pick unique new position and size (auto-layout)
				y: height - 13 - this.axisThickness
			})
		);
		
	}
	
	
	syncModelWithArtefact(relationship, cls, parentElement, createNewArtefact) {
		/* new free-floating thing in the model --> new artifact */
		this.model['-->'+relationship].e('add')
			::filter(c => c.class === relationship)
			::map(c=>c[2])
			::withLatestFrom(this.p('width'), this.p('height'))
			::map(([model, width, height]) =>
				this[$$recycle](model) ||
				createNewArtefact({ model, width, height }))
			.do((artefact) => { artefact.free = true })
			::subscribe_( this.freeFloatingStuff.e('add') , n=>n() );
		/* new part artifact --> house svg element */
		this.freeFloatingStuff.e('add')
		    .subscribe((artefact) => {
			    /* event when removed */
			    const removed = artefact.p('parent')::filter(parent => parent !== this);
		    	/* put into the dom */
				parentElement.append(artefact.element);
			    /* remove from dom when removed */
				removed.subscribe(() => {
					if (artefact.element.jq.parent()[0] === this.element) {
						artefact.element.jq.remove();
					}
				});
			});
	}
	
	get draggable() { return true }
	
	drop(droppedEntity, originalDropzone = this) {
		if (originalDropzone === this) {
			// dropped directly into this lyph rectangle
			if ([LyphRectangle, NodeGlyph].includes(droppedEntity.constructor)) {
				this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
				this.freeFloatingStuff.add(droppedEntity, { force: true });
			} else {
				return false;
			}
		} else if (this.longitudinalBorders.has(originalDropzone)) {
			// dropped onto longitudinal border (to become layer)
			if ([LyphRectangle].includes(droppedEntity.constructor)) {
				const rels      = [...this.model['-->HasLayer']];
				const positions = rels::ldMap('relativePosition');
				let newPosition;
				if (rels.length === 0) {
					newPosition = 0;
				} else if (originalDropzone === this.topBorder) {
					newPosition = positions::max() + 1;
				} else { // this.bottomBorder
					newPosition = positions::min() - 1;
				}
				let oldRel = rels::find(rel => rel[2] === droppedEntity.model);
				if (oldRel) { this.model['-->HasLayer'].delete(oldRel) }
				this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
				window.module.classes.HasLayer.new({
					[1]: this.model,
					[2]: droppedEntity.model,
					relativePosition: newPosition
				});
				// this.layers.add(droppedEntity, { force: true });
			} else {
				return false;
			}
			// TODO: dropped on border (also put code in border class)
		}
	}
	
}
