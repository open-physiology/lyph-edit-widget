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
import LyphRectangle from "./LyphRectangle";
import {startWith} from "rxjs/operator/startWith";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class CoalescenceScenarioRectangle extends Transformable {
		
	@property({ isValid: _isNumber }) width;
	@property({ isValid: _isNumber }) height;
	
	radialBorders       = new ObservableSet();
	@property() leftBorder;
	@property() rightBorder;
	
	longitudinalBorders = new ObservableSet();
	@property() topBorder;
	@property() bottomBorder;
	
	lyphs = new ObservableSet();
	@property() normalLyph;
	@property() rotatedLyph;
	
	@property() sharedLayer;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'width',
			'height'
		], { showAxis: true, draggable: true });
		
		this[$$toBeRecycled] = new WeakMap();
		
		// /* create the border artifacts */
		// for (let setKey of ['radialBorders', 'longitudinalBorders']) {
		// 	this.model[setKey].e('add')::map(border => this[$$recycle](border) || new BorderLine({
		// 		parent : this,
		// 		model  : border
		// 	}))::subscribe_( this[setKey].e('add') , n=>n() );
		// }
		// TODO: coalescence-scenario does not (yet) have borders of its own
		
		/* create the lyph artifacts */
		this.model.lyphs.e('add')::map(lyph => this[$$recycle](lyph) || new LyphRectangle({
			parent   : this,
			model    : lyph,
			draggable: false,
			free     : false
		}))::subscribe_( this.lyphs.e('add') , n=>n() );
		
		/* create the shared layer artifacts */
		this.p('normalLyph.model.-->HasLayer')
			::filter(layers => layers.size > 0)
			::map(layers => [...layers]::maxBy('relativePosition')[2])
			::filter(layer => layer !== (this.sharedLayer && this.sharedLayer.model))
			::map(layer => this[$$recycle](layer) || new LyphRectangle({
				parent   : this,
				model    : layer,
				draggable: false,
				free     : false
			}))
			::subscribe_( this.p('sharedLayer'), v=>v() );
		
		/* synchronize specific children with the 'children' set */
		for (let setKey of [
			'radialBorders',
			'longitudinalBorders',
		    'lyphs'
		]) {
			this[setKey].e('add')::subscribe_( this.children.e('add') , n=>n() );
			this.children.e('delete')::subscribe_( this[setKey].e('delete') , n=>n() );
		}
		this.p('sharedLayer')::startWith(null)::pairwise().subscribe(([prev, curr]) => {
			if (prev) { this.children.delete(prev) }
			if (curr) { this.children.add(curr) }
		});
		
		/* create a random color (one per layer, stored in the model) */
		if (!this.model[$$backgroundColor]) {
			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
		}
		
	}
	
	createElement() {
		const group = this.root.gElement();
		
		group.g().addClass('main-shadow');
		group.g().addClass('main-shape');
		group.g().addClass('shared-layer');
		group.g().addClass('lyphs');
		group.g().addClass('borders');
		group.g().addClass('corners');
		
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
		
		{
			let mainShadowGroup = this.inside.svg.select('.main-shadow');
			
			let shadow = mainShadowGroup.rect().attr({
				filter: this.root.element.svg.filter(Snap.filter.shadow(8, 8, 4, '#111111', 0.4)),
			});
			
			this.p(['free', 'dragging']).subscribe(([f, d]) => {
				shadow.attr({ visibility: (f && d ? 'visible' : 'hidden') })
			});
			
			this.p('width') .subscribe((width)  => { shadow.attr({ width  }) });
			this.p('height').subscribe((height) => { shadow.attr({ height }) });
		}
		
		{
			let mainRectangleGroup = this.inside.svg.select('.main-shape');
			
			let rectangle = mainRectangleGroup.rect().attr({
				stroke        : 'none',
				fill          : this.model[$$backgroundColor],
				shapeRendering: 'crispEdges'
			});
			
			this.p('width') .subscribe((width)  => { rectangle.attr({ width  }) });
			this.p('height').subscribe((height) => { rectangle.attr({ height }) });
		}
		
		
		
		/* corner resize handles */
		{
			this.corners = {};
			for (let [c, resizes] of [
				['tl', { top:    true, left:  true }],
				['tr', { top:    true, right: true }],
				['bl', { bottom: true, left:  true }],
				['br', { bottom: true, right: true }]
			]) {
				this.corners[c] = new CornerHandle({ parent: this, resizes });
				this.inside.jq.children('.corners').append(this.corners[c].element);
			}
			this.corners.tl::assign({ x: 0, y: 0 });
			this.corners.tr::assign({ y: 0 });
			this.corners.bl::assign({ x: 0 });
			this.p(['width', 'height']).subscribe(([w, h]) => {
				this.corners.tr::assign({ x: w });
				this.corners.bl::assign({ y: h });
				this.corners.br::assign({ x: w, y: h });
			});
		}
		
		{
			const borderGroup = this.inside.jq.children('.borders');
			
			this.leftBorder  = null;
			this.rightBorder = null;
			this.radialBorders.e('add').subscribe((borderLine) => {
				const removed = this.radialBorders.e('delete')::filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
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
				borderGroup.append(borderLine.element);
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
		}
		
		
		{
			const lyphGroup = this.inside.jq.children('.lyphs');
			
			this.normalLyph  = null;
			this.rotatedLyph = null;
			this.lyphs.e('add').subscribe((lyph) => {
				const removed = this.lyphs.e('delete')::filter(l=>l===lyph);
				lyphGroup.append(lyph.element);
				lyph.hideOuterLayer = true;
				removed.subscribe(() => {
					lyph.hideOuterLayer = false;
					lyph.element.remove();
				});
				if (!this.normalLyph) {
					this.normalLyph = lyph;
					removed.subscribe(() => { this.normalLyph = null });
				} else if (!this.rotatedLyph) {
					this.rotatedLyph = lyph;
					removed.subscribe(() => { this.rotatedLyph = null });
				}
			});
			
			this.p([
				'normalLyph.layers', 'rotatedLyph.layers',
				'normalLyph',        'rotatedLyph',
			    'width', 'height'
			])  ::filter(([nl, rl]) => nl.size > 0 && rl.size > 0)
				.subscribe(([normalLayers, rotatedLayers, normalLyph, rotatedLyph, width, height]) => {
					normalLyph.width = rotatedLyph.width = width;
					const layerThickness = (height - normalLyph.axisThickness - rotatedLyph.axisThickness) /
					                       (normalLayers.size + rotatedLayers.size - 1);
					normalLyph .height = normalLayers .size * layerThickness + normalLyph .axisThickness;
					rotatedLyph.height = rotatedLayers.size * layerThickness + rotatedLyph.axisThickness;
					rotatedLyph.transformation = ID_MATRIX
						.translate(rotatedLyph.width / 2, rotatedLyph.height / 2)
						.rotate(180)
						.translate(-rotatedLyph.width / 2, -rotatedLyph.height / 2);
					normalLyph.transformation = ID_MATRIX
						.translate(0, rotatedLyph.axisThickness + (rotatedLayers.size - 1) * layerThickness);
				});
			
		}
		
		{
			const sharedLayerGroup = this.inside.jq.children('.shared-layer');
			
			this.p('sharedLayer')::filter(v=>v).subscribe((sharedLayer) => {
				const removed = this.p('sharedLayer')::filter(sl=>sl!==sharedLayer);
				sharedLayerGroup.append(sharedLayer.element);
				sharedLayer.p('topBorder')
					::takeUntil(removed)
					::filter(v=>v)
					.subscribe((topBorder) => { topBorder.isInnerBorder = true });
				removed.subscribe(() => {
					if (sharedLayer.topBorder) { sharedLayer.topBorder.isInnerBorder = false }
					sharedLayer.element.remove();
				});
			});
			
			this.p([
				'normalLyph.layers', 'rotatedLyph.layers', 'sharedLayer',
				'normalLyph',        'rotatedLyph',
			    'width', 'height'
			])  ::filter(([nl, rl, sl]) => nl.size > 0 && rl.size > 0 && sl)
				.subscribe(([normalLayers, rotatedLayers, sharedLayer, normalLyph, rotatedLyph, width, height]) => {
					sharedLayer.width = width;
					const layerThickness = (height - normalLyph.axisThickness - rotatedLyph.axisThickness) /
					                       (normalLayers.size + rotatedLayers.size - 1);
					sharedLayer.height = layerThickness;
					sharedLayer.transformation = ID_MATRIX
						.translate(0, rotatedLyph.axisThickness + (rotatedLayers.size - 1) * layerThickness);
					sharedLayer.spillover  = (rotatedLayers.size - 1) * layerThickness;
					sharedLayer.spillunder = (normalLayers .size - 1) * layerThickness;
				});
			
			// TODO
			
		}
		
		// /* shared layer */
		// {
		//
		//
		// 	/* new layer in the model --> new layer artifact */
		// 	this[$$relativeLayerPosition] = new WeakMap();
		// 	this.model['-->HasLayer'].e('add').subscribe((rel) => {
		// 		const removed = this.model['-->HasLayer'].e('delete')::filter(r=>r===rel);
		// 		let layerBox = this[$$recycle](rel[2]) || new LyphRectangle({
		// 			parent  : this,
		// 			model   : rel[2],
		// 			showAxis: false,
		// 			free    : false
		// 		});
		// 		this[$$relativeLayerPosition].set(layerBox, rel.p('relativePosition')::takeUntil(removed));
		// 		this.layers.add(layerBox);
		// 	});
		//
		// 	/* new layer artifact --> house svg element */
		// 	this.layers.e('add').subscribe((layer) => {
		// 		this.inside.jq.children('.layers').append(layer.element);
		// 		const removed = layer.p('parent')::filter(parent=>parent!==this);
		//
		// 		for (let [source, target,  border      ] of [
		// 			     [this,   layer,  'leftBorder' ],
		// 			     [this,   layer,  'rightBorder'],
		// 			     [layer,  this,   'leftBorder' ],
		// 			     [layer,  this,   'rightBorder']
		// 		]) {
		// 			source.p(`${border}.model.nature`)
		// 				::takeUntil(removed)
		// 				::withLatestFrom(target.p(`${border}.model`))
		// 				.subscribe(([nature, borderModel]) => {
		// 					borderModel.nature = nature;
		// 				});
		// 		}
		//
		// 		removed.subscribe(() => {
		// 			if (layer.element.jq.parent()[0] === this.inside.jq.children('.layers')[0]) {
		// 				layer.element.jq.remove();
		// 			}
		// 		});
		// 	});
		//
		// 	/* layer artifact set changed --> refresh layer order */
		// 	combineLatest(this.layers.p('value'), this.p('hideOuterLayer'))
		// 		::map(([layers, hideOuterLayer]) => [[...layers], hideOuterLayer])
		// 		::map(([layers, hideOuterLayer]) => ({
		// 			dimensions:        this.pObj(['width', 'height']),
		// 			layers:            layers,
		// 			relativePositions: layers.map(::this[$$relativeLayerPosition].get),
		// 			hideOuterLayer:    hideOuterLayer
		// 		}))
		// 		::switchMap(
		// 			({dimensions, relativePositions}) =>
		// 				combineLatest(dimensions, ...relativePositions),
		// 			({layers, hideOuterLayer}, [{width, height}, ...relativePositions]) => ({
		// 				layers:         layers::sortBy(l => -relativePositions[layers.indexOf(l)]),
		// 				width:          width,
		// 				height:        (height - this.axisThickness) / layers.length,
		// 				hideOuterLayer: hideOuterLayer
		// 			}))
		// 		.subscribe(({layers, width, height, hideOuterLayer}) => {
		// 			if (hideOuterLayer) { layers[0].hidden = true }
		// 			for (let i = hideOuterLayer ? 1 : 0; i < layers.length; ++i) {
		// 				layers[i]::assign({
		// 					parent: this
		// 				}, {
		// 					width:          width,
		// 					height:         height,
		// 					hidden:         false,
		// 					free:           false,
		// 					spillunder:     (layers.length - i - 1) * height,
		// 					transformation: ID_MATRIX.translate(0, i * height)
		// 				});
		// 				layers[i].moveToFront();
		// 			}
		// 		});
		// }
		
		
	}
	
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
	// 			const rels      = [...this.model['-->HasLayer']];
	// 			const positions = rels::ldMap('relativePosition');
	// 			let newPosition;
	// 			if (rels.length === 0) {
	// 				newPosition = 0;
	// 			} else if (originalDropzone === this.topBorder) {
	// 				newPosition = positions::max() + 1;
	// 			} else { // this.bottomBorder
	// 				newPosition = positions::min() - 1;
	// 			}
	// 			let oldRel = rels::find(rel => rel[2] === droppedEntity.model);
	// 			if (oldRel) { this.model['-->HasLayer'].delete(oldRel) }
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
