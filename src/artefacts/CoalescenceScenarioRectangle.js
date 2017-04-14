import Snap from '../libs/snap.svg';

import {assign, maxBy} from 'lodash-bound';

import {
	isNumber as _isNumber,
	add      as _add
} from 'lodash';

import chroma from '../libs/chroma.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import BorderLine from './BorderLine';

import Transformable from "./Transformable";
import {ID_MATRIX} from "../util/svg";
import CornerHandle from "./CornerHandle";
import LyphRectangle from "./LyphRectangle";


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
		], { showAxis: true, draggable: true, free: true });
		
		this[$$toBeRecycled] = new WeakMap();
		
		//
		//
		//
		// this.p(['width', 'height', 'transformation']).subscribe(::console.log);
		//
		//
		
		
		
		/* create the border artifacts */
		this.radialBorders.add(new BorderLine({
			parent : this,
			model  : window.module.classes.Border.new()
		}));
		this.radialBorders.add(new BorderLine({
			parent : this,
			model  : window.module.classes.Border.new()
		}));
		this.longitudinalBorders.add(new BorderLine({
			parent : this,
			model  : window.module.classes.Border.new()
		}));
		this.longitudinalBorders.add(new BorderLine({
			parent : this,
			model  : window.module.classes.Border.new()
		}));
		// /* create the border artifacts */
		// for (let setKey of ['radialBorders', 'longitudinalBorders']) {
		// 	this.model[setKey].e('add').map(border => this[$$recycle](border) || new BorderLine({
		// 		parent : this,
		// 		model  : border
		// 	})).subscribe( this[setKey].e('add') );
		// }
		// TODO: coalescence-scenario does not (yet) have borders of its own
		
		/* create the lyph artifacts */
		this.model.lyphs.e('add').map(lyph => this[$$recycle](lyph) || new LyphRectangle({
			parent   : this,
			model    : lyph,
			draggable: false,
			free     : false
		})).subscribe( this.lyphs.e('add') );
		
		/* create the shared layer artifacts */
		this.p('normalLyph.model.-->HasLayer')
			.filter(layers => layers.size > 0)
			.map(layers => [...layers]::maxBy('relativePosition')[2])
			.filter(layer => layer !== (this.sharedLayer && this.sharedLayer.model))
			.map(layer => this[$$recycle](layer) || new LyphRectangle({
				parent   : this,
				model    : layer,
				draggable: false,
				free     : false
			}))
			.subscribe( this.p('sharedLayer') );
		
		/* synchronize specific children with the 'children' set */
		for (let setKey of [
			'radialBorders',
			'longitudinalBorders',
		    'lyphs'
		]) {
			this[setKey].e('add').subscribe( this.children.e('add') );
			this.children.e('delete').subscribe( this[setKey].e('delete') );
		}
		this.p('sharedLayer').startWith(null).pairwise().subscribe(([prev, curr]) => {
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
		
		group.g().addClass('fixed main-shadow');
		group.g().addClass('fixed main-shape');
		group.g().addClass('fixed shared-layer');
		group.g().addClass('fixed lyphs');
		group.g().addClass('fixed borders');
		group.g().addClass('fixed corners');
		
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
		
		{ // TODO: do borders properly; this was hacked together quickly
			const borderGroup = this.inside.jq.children('.borders');
			
			this.leftBorder  = null;
			this.rightBorder = null;
			this.radialBorders.e('add').subscribe((borderLine) => {
				const removed = this.radialBorders.e('delete').filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
				removed.subscribe(() => { borderLine.element.remove() });
				borderLine.y1 = 0;
				this.p('height').subscribe( borderLine.p('y2') );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					borderLine.resizes = { left: true };
					borderLine.x = 0;
					removed.subscribe(() => { this.leftBorder = null });
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					borderLine.resizes = { right: true };
					this.p('width').subscribe( borderLine.p('x') );
					removed.subscribe(() => { this.rightBorder = null });
				} else {
					throw new Error('Trying to add a third radial border.');
				}
			});
			this.topBorder    = null;
			this.bottomBorder = null; // also axis
			this.longitudinalBorders.e('add').subscribe((borderLine) => {
				const removed = this.longitudinalBorders.e('delete').filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
				removed.subscribe(() => { borderLine.element.remove() });
				borderLine.x1 = 0;
				this.p('width').subscribe( borderLine.p('x2') );
				if (!this.topBorder) {
					this.topBorder = borderLine;
					borderLine.resizes = { top: true };
					borderLine.y = 0;
					removed.subscribe(() => { this.topBorder = null });
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					borderLine.resizes = { bottom: true };
					this.p('height').subscribe( borderLine.p('y') );
					removed.subscribe(() => { this.bottomBorder = this.axis = null });
				}
			});
		}
		
		
		{
			const lyphGroup = this.inside.jq.children('.lyphs');
			
			this.normalLyph  = null;
			this.rotatedLyph = null;
			this.lyphs.e('add').subscribe((lyph) => {
				const removed = this.lyphs.e('delete').filter(l=>l===lyph);
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
			])  .filter(([nl, rl]) => nl.size > 0 && rl.size > 0)
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
			
			this.p('sharedLayer').filter(v=>v).subscribe((sharedLayer) => {
				const removed = this.p('sharedLayer').filter(sl=>sl!==sharedLayer);
				sharedLayerGroup.append(sharedLayer.element);
				sharedLayer.p('topBorder')
					.takeUntil(removed)
					.filter(v=>v)
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
			])  .filter(([nl, rl, sl]) => nl.size > 0 && rl.size > 0 && sl)
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
		
		
		{
			const borderGroup = this.inside.jq.children('.borders');
			this.leftBorder  = null;
			this.rightBorder = null;
			this.radialBorders.e('add').subscribe((borderLine) => {
				const removed = this.radialBorders.e('delete').filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
				removed.subscribe(() => { borderLine.element.remove() });
				this.p(['height', 'spillunder'], _add)
				    .subscribe( borderLine.p('y2') );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					borderLine.resizes = { left: true };
					borderLine.x = 0;
					this.p(['leftCornerRadius', 'hiddenOuterLayerLength', 'spillover'], (cr, hol, so) => (cr + hol - so))
						.subscribe( borderLine.p('y1') );
					removed.subscribe(() => { this.leftBorder = null });
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					borderLine.resizes = { right: true };
					this.p('width').subscribe( borderLine.p('x') );
					this.p(['rightCornerRadius', 'hiddenOuterLayerLength', 'spillover'], (cr, hol, so) => (cr + hol - so))
						.subscribe( borderLine.p('y1') );
					removed.subscribe(() => { this.rightBorder = null });
				} else {
					throw new Error('Trying to add a third radial border.');
				}
			});
			this.topBorder    = null;
			this.bottomBorder = null; // also axis
			this.longitudinalBorders.e('add').subscribe((borderLine) => {
				const removed = this.longitudinalBorders.e('delete').filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
				removed.subscribe(() => { borderLine.element.remove() });
				
				this.p('leftCornerRadius').subscribe( borderLine.p('x1') );
				
				this.p(['rightCornerRadius', 'width'], (rcr, w) => w-rcr)
					.subscribe( borderLine.p('x2') );
				if (!this.topBorder) {
					this.topBorder = borderLine;
					borderLine.resizes = { top: true };
					this.p('hiddenOuterLayerLength').subscribe( borderLine.p('y') );
					removed.subscribe(() => { this.topBorder = null });
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					borderLine.resizes = { bottom: true };
					this.p('height').subscribe( borderLine.p('y') );
					removed.subscribe(() => { this.bottomBorder = null });
				}
			});
			
			
		}
		
		
		
		this.p(['normalLyph', 'rotatedLyph', 'sharedLayer']).subscribe(([normalLyph, rotatedLyph, sharedLayer]) => {
			
			for (let [source,  sBorder,      target,       tBorder     ] of [
				[this,        'leftBorder' , normalLyph,  'leftBorder' ],
			    [this,        'rightBorder', normalLyph,  'rightBorder'],
			    [normalLyph,  'leftBorder' , this,        'leftBorder' ],
			    [normalLyph,  'rightBorder', this,        'rightBorder'],
				[this,        'leftBorder' , sharedLayer, 'leftBorder' ],
			    [this,        'rightBorder', sharedLayer, 'rightBorder'],
			    [sharedLayer, 'leftBorder' , this,        'leftBorder' ],
			    [sharedLayer, 'rightBorder', this,        'rightBorder'],
				[this,        'leftBorder' , rotatedLyph, 'rightBorder'],
			    [this,        'rightBorder', rotatedLyph, 'leftBorder' ],
			    [rotatedLyph, 'leftBorder' , this,        'rightBorder'],
			    [rotatedLyph, 'rightBorder', this,        'leftBorder' ]
			]) {
				source.p(`${sBorder}.model.nature`)
					// .takeUntil(removed) // TODO: do this
					.withLatestFrom(target.p(`${tBorder}.model`))
					.subscribe(([nature, borderModel]) => {
						borderModel.nature = nature;
					});
			}
			
		});
		
		
		
		// /* shared layer */
		// {
		//
		//
		// 	/* new layer in the model --> new layer artifact */
		// 	this[$$relativeLayerPosition] = new WeakMap();
		// 	this.model['-->HasLayer'].e('add').subscribe((rel) => {
		// 		const removed = this.model['-->HasLayer'].e('delete').filter(r=>r===rel);
		// 		let layerBox = this[$$recycle](rel[2]) || new LyphRectangle({
		// 			parent  : this,
		// 			model   : rel[2],
		// 			showAxis: false,
		// 			free    : false
		// 		});
		// 		this[$$relativeLayerPosition].set(layerBox, rel.p('relativePosition').takeUntil(removed));
		// 		this.layers.add(layerBox);
		// 	});
		//
		// 	/* new layer artifact --> house svg element */
		// 	this.layers.e('add').subscribe((layer) => {
		// 		this.inside.jq.children('.layers').append(layer.element);
		// 		const removed = layer.p('parent').filter(parent=>parent!==this);
		//
		// 		for (let [source, target,  border      ] of [
		// 			     [this,   layer,  'leftBorder' ],
		// 			     [this,   layer,  'rightBorder'],
		// 			     [layer,  this,   'leftBorder' ],
		// 			     [layer,  this,   'rightBorder']
		// 		]) {
		// 			source.p(`${border}.model.nature`)
		// 				.takeUntil(removed)
		// 				.withLatestFrom(target.p(`${border}.model`))
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
		// 	Observable.combineLatest(this.layers.p('value'), this.p('hideOuterLayer'))
		// 		.map(([layers, hideOuterLayer]) => [[...layers], hideOuterLayer])
		// 		.map(([layers, hideOuterLayer]) => ({
		// 			dimensions:        this.pObj(['width', 'height']),
		// 			layers:            layers,
		// 			relativePositions: layers.map(::this[$$relativeLayerPosition].get),
		// 			hideOuterLayer:    hideOuterLayer
		// 		}))
		// 		.switchMap(
		// 			({dimensions, relativePositions}) =>
		// 				Observable.combineLatest(dimensions, ...relativePositions),
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
