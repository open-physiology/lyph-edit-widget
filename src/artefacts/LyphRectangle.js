import $          from '../libs/jquery.js';
import Snap from '../libs/snap.svg';

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
import isArray from 'lodash-bound/isArray';

import _isNumber from 'lodash/isNumber';
import _isFinite from 'lodash/isFinite';
import _isBoolean from 'lodash/isBoolean';
import _add from 'lodash/add';
import _defer from 'lodash/defer';
import _zip from 'lodash/zip';

import uniqueId from 'lodash/uniqueId';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';

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
import MeasurableGlyph from "./MeasurableGlyph";
import MaterialGlyph from "./MaterialGlyph";
import CoalescenceScenarioRectangle from "./CoalescenceScenarioRectangle";
import {setCTM} from "../util/svg";
import {_isNonNegative} from "../util/misc";
import {scan} from "rxjs/operator/scan";
import {tX} from "../util/svg";
import {tY} from "../util/svg";
import {tap} from "../util/rxjs";
import {setVirtualParent} from "../util/svg";
import ProcessLine from "./ProcessLine";
import {moveToFront} from "../util/svg";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


const CLOSED_CORNER_RADIUS = 15;


export default class LyphRectangle extends Transformable {
		
	// && this.minWidth  <= v
	// && this.minHeight <= v
	@property({ isValid: _isNonNegative, initial: 0, transform(w) { return Math.max(w || 0, this.minWidth  || 0) } }) width;
	@property({ isValid: _isNonNegative, initial: 0, transform(h) { return Math.max(h || 0, this.minHeight || 0) } }) height;
	@property({ isValid: _isNonNegative, initial: 0 }) spillover;
	@property({ isValid: _isNonNegative, initial: 0 }) spillunder;
	@property({ isValid: _isNonNegative, initial: 0, readonly: true }) hiddenOuterLayerLength;
	
	@flag(false) hideOuterLayer;
	
	@flag(false) showAxis;
	
	get axisThickness() { return this.model && this.model.axis && this.showAxis ? 14 : 0 }
	
	get minWidth()  { return 4 * CLOSED_CORNER_RADIUS }
	
	get minHeight() { return this.axisThickness + Math.max(2 * CLOSED_CORNER_RADIUS, this.model ? [...this.model.layers].length * 2 : 2) }
	
	segments            = new ObservableSet();
	layers              = new ObservableSet();
	
	freeFloatingStuff   = new ObservableSet();
	
	radialBorders       = new ObservableSet();
	longitudinalBorders = new ObservableSet();
	
	@property() leftBorder;
	@property() rightBorder;
	@property() topBorder;
	@property() bottomBorder;
	
	@property({ initial: 0 }) leftCornerRadius;
	@property({ initial: 0 }) rightCornerRadius;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'width',
			'height'
		], { showAxis: !!this.model.axis, draggable: true, free: true });
		
		this[$$toBeRecycled] = new WeakMap();
		
		/* create the border artifacts */
		for (let setKey of ['radialBorders', 'longitudinalBorders']) {
			this.model[setKey].e('add')::map(border => {
				let recycled = this[$$recycle](border);
				if (recycled) { return recycled }
				return new BorderLine({
					parent: this,
					model:  border
				});
			}).subscribe( this[setKey].e('add') );
		}
		
		for (let setKey of [
			'layers',
			'segments',
			'radialBorders',
			'longitudinalBorders'
		]) {
			this[setKey] .e('add')   ::subscribe_( this.children.e('add')   , n=>n() );
			this.children.e('delete')::subscribe_( this[setKey].e('delete') , n=>n() );
		}
		
		/* corner radii */
		this.p('leftBorder.model.nature')
			::map(n => n::isArray() ? n : [n])
			::map(n => n.length === 1 && n[0] === 'open' ? 0 : CLOSED_CORNER_RADIUS)
			::subscribe_( this.p('leftCornerRadius'), v=>v() );
		this.p('rightBorder.model.nature')
			::map(n => n::isArray() ? n : [n])
			::map(n => n.length === 1 && n[0] === 'open' ? 0 : CLOSED_CORNER_RADIUS)
			::subscribe_( this.p('rightCornerRadius'), v=>v() );
		
		/* length cut off of the top of a lyph (to hide the outer layer) */
		this.p(['height', 'hideOuterLayer', 'layers'], (height, hideOuterLayer, layers) =>
			(hideOuterLayer ? (height - this.axisThickness) / layers.size : 0))
			::subscribe_( this.pSubject('hiddenOuterLayerLength'), v=>v() );
		
		/* maintain inner-border-ness of our bottom border */
		// TODO: check (also?) whether there is an axis in the model (currently not working?)
		this.p(['parent?.bottomBorder?.isInnerBorder', 'showAxis', 'bottomBorder'])
		    .subscribe(([pi, a, bottomBorder]) => {
		    	if (bottomBorder) { bottomBorder.isInnerBorder = pi || a }
		    });
		
		/* create a random color (one per layer, stored in the model) */
		if (!this.model[$$backgroundColor]) {
			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
		}
		
		
		
		
		// this.p('dragging').subscribe((dragging) => {
		// 	if (!dragging) { debugger }
		// 	console.log(''+this, 'dragging =', dragging); // TODO: remove
		// });
		
		
		
		
	}
	
	createElement() {
		const group = this.root.gElement();
		
		/* create fixed subgroups of the lyph */
		                   group.g().addClass('fixed main-shadow');
		                   group.g().addClass('fixed main-shape');
		                   group.g().addClass('fixed highlight-border');
		                   group.g().addClass('fixed layers');
		                   group.g().addClass('fixed segments');
		                   group.g().addClass('fixed parts');
		let axis =         group.g().addClass('fixed axis');
		                   group.g().addClass('fixed borders');
		                   group.g().addClass('fixed corners');
		let processLines = group.g().addClass('fixed processes');
		                   group.g().addClass('fixed nodes');
		                   group.g().addClass('fixed materials');
		                   group.g().addClass('fixed measurables');
		
		/* return representation(s) of element */
		return {
			element:      group       .node,
			axis:         axis        .node,
			processLines: processLines.node
		};
	}
	
	[$$recycle](model) {
		if (!this[$$toBeRecycled].has(model)) { return false }
		let result = this[$$toBeRecycled].get(model);
		this[$$toBeRecycled].delete(model);
		return result;
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		const createMainShape = () => {
			let mainRectangleGroup = this.inside.svg.select('.main-shape').g();
			
			let rectangleTL = mainRectangleGroup.rect().attr({
				stroke        : 'none',
				shapeRendering: 'crispEdges',
				x: 0,
				y: 0
			});
			let rectangleTR = mainRectangleGroup.rect().attr({
				stroke        : 'none',
				shapeRendering: 'crispEdges',
				x: CLOSED_CORNER_RADIUS,
				y: 0
			});
			let rectangleB = mainRectangleGroup.rect().attr({
				stroke        : 'none',
				shapeRendering: 'crispEdges',
				x: 0,
				y: CLOSED_CORNER_RADIUS
			});
			
		
			/* tooltip placement for three main rectangles */
			{
				let tooltipText = $.svg(`<title></title>`).appendTo(rectangleTL.node);
				this.p('model.name').subscribe( ::tooltipText.text );
			}
			{
				let tooltipText = $.svg(`<title></title>`).appendTo(rectangleTR.node);
				this.p('model.name').subscribe( ::tooltipText.text );
			}
			{
				let tooltipText = $.svg(`<title></title>`).appendTo(rectangleB.node);
				this.p('model.name').subscribe( ::tooltipText.text );
				// this.p(['transformation', 'width', 'height'])::map(([t, w, h])=>`(${t.a},${t.b},${t.c},${t.d},${t.e},${t.f}), ${w}x${h}`).subscribe( ::tooltipText.text );
			}
			
			this.p('width').subscribe((width)  => {
				rectangleB .attr({ width: width                        });
				rectangleTL.attr({ width: width - CLOSED_CORNER_RADIUS });
				rectangleTR.attr({ width: width - CLOSED_CORNER_RADIUS });
			});
			this.p(['height', 'spillover', 'spillunder', 'hiddenOuterLayerLength'])
			    .subscribe(([height, so, su, hol]) => {
					rectangleB .attr({ height: height + so + su - CLOSED_CORNER_RADIUS - hol });
					rectangleTL.attr({ height: height           - CLOSED_CORNER_RADIUS - hol });
					rectangleTR.attr({ height: height           - CLOSED_CORNER_RADIUS - hol });
				});
			this.p(['spillover', 'hiddenOuterLayerLength']).subscribe(([so, hol]) => {
				mainRectangleGroup.node::setCTM(ID_MATRIX.translate(0, hol - so));
			});
			this.p('leftCornerRadius').subscribe((radius) => {
				rectangleTL.attr({
					rx: radius,
					ry: radius
				});
			});
			this.p('rightCornerRadius').subscribe((radius) => {
				rectangleTR.attr({
					rx: radius,
					ry: radius
				});
			});
			
			return mainRectangleGroup;
		};
		
		createMainShape().attr({ fill: this.model[$$backgroundColor] });
		
		{
			let mainShadowGroup = this.inside.svg.select('.main-shadow');
			
			let shadow = createMainShape().attr({
				filter: this.root.element.svg.filter(Snap.filter.shadow(8, 8, 4, '#111111', 0.4)),
			});
			mainShadowGroup.append(shadow);
			
			this.p(['free', 'dragging']).subscribe(([f, d]) => {
				shadow.attr({ visibility: (f && d ? 'visible' : 'hidden') })
			});
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
			this.corners.tr::assign({       y: 0 });
			this.corners.bl::assign({ x: 0       });
			this.p(['width', 'height']).subscribe(([w, h]) => {
				this.corners.tr::assign({ x: w       });
				this.corners.bl::assign({       y: h });
				this.corners.br::assign({ x: w, y: h });
			});
		}
		
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
		
		/* new ProcessLine child --> house it */
		this.children.e('add')::filter(c => c instanceof ProcessLine).subscribe((pl) => {
			this.processLines.jq.append(pl.element);
		});
		
		/* new layer artifact --> house svg element */
		this.layers.e('add').subscribe((layer) => {
			this.inside.jq.children('.layers').append(layer.element);
			const removed = layer.p('parent')::filter(parent=>parent!==this);
			
			for (let [source, target,  border      ] of [
				     [this,   layer,  'leftBorder' ],
				     [this,   layer,  'rightBorder'],
				     [layer,  this,   'leftBorder' ],
				     [layer,  this,   'rightBorder']
			]) {
				source.p(`${border}.model.nature`)
					::takeUntil(removed)
					::withLatestFrom(target.p(`${border}.model`))
					.subscribe(([nature, borderModel]) => {
						borderModel.nature = nature;
					});
			}
			
			removed.subscribe(() => {
				if (layer.element.jq.parent()[0] === this.inside.jq.children('.layers')[0]) {
					layer.element.jq.remove();
				}
			});
		});
		
		/* layer artifact set changed --> refresh layer order */
		combineLatest(this.layers.p('value'), this.p('hideOuterLayer'))
			::map(([layers, hideOuterLayer]) => [[...layers], hideOuterLayer])
			::map(([layers, hideOuterLayer]) => ({
				dimensions:        this.pObj(['width', 'height']),
				layers:            layers,
				relativePositions: layers.map(::this[$$relativeLayerPosition].get),
				hideOuterLayer:    hideOuterLayer
			}))
			::switchMap(
				({dimensions, relativePositions}) =>
					combineLatest(dimensions, ...relativePositions),
				({layers, hideOuterLayer}, [{width, height}, ...relativePositions]) => ({
					layers:         layers::sortBy(l => -relativePositions[layers.indexOf(l)]),
					width:          width,
					height:        (height - this.axisThickness) / layers.length,
					hideOuterLayer: hideOuterLayer
				}))
			.subscribe(({layers, width, height, hideOuterLayer}) => {
				if (hideOuterLayer) { layers[0].hidden = true }
				for (let i = hideOuterLayer ? 1 : 0; i < layers.length; ++i) {
					let layer = layers[i];
					const removed = layer.p('parent')::filter(parent=>parent!==this);
					layer::assign({
						parent: this
					}, {
						width:          width,
						height:         height,
						hidden:         false,
						free:           false,
						spillunder:     (layers.length - i - 1) * height,
						transformation: ID_MATRIX.translate(0, i * height)
					});
					let spillunder = (layers.length - i - 1) * height;
					combineLatest(
						this.p('dragging'),
						layer.p('dragging'),
						(td, ld) => td || !ld
					)::takeUntil(removed).subscribe((spill) => {
						layer::assign({ spillunder: spill ? spillunder : 0 });
					});
					removed::take(1).subscribe(() => {
						layer::assign({ spillunder: 0 });
					});
					layer.element::moveToFront();
				}
			});
		
		
		// TODO: if a lyph has no axis, do draw an extra border-like
		//     : line to cover up the 'closed side' gaps
		
		
		
		this.freeFloatingStuff.e('add')::subscribe_( this.children.e('add') , n=>n() );
		this.children.e('delete')::subscribe_( this.freeFloatingStuff.e('delete') , n=>n() );
		this.syncModelWithArtefact(
			'HasPart',
			a => a instanceof LyphRectangle,
			this.inside.jq.children('.parts')[0],
			({model, width, height}) => new LyphRectangle({
				model,
				x:      5,          // TODO: pick unique new position and size (auto-layout)
				y:      5,          //
				width:  width  / 2, //
				height: height / 2  //
			})
		);
		
		if (!this.glyphPosition) { // TODO: this is a hack; do actual auto-layout
			this.glyphPosition = 2;
			this.newGlyphPosition = () => {
				this.glyphPosition += 25;
				return this.glyphPosition;
			};
			this.newFarGlyphPosition = () => {
				this.glyphPosition += 45;
				return this.glyphPosition;
			};
		}
		
		this.syncModelWithArtefact(
			'ContainsNode',
			a => a instanceof NodeGlyph,
			this.inside.jq.children('.nodes')[0],
			({model, width, height}) => new NodeGlyph({
				model,
				x: this.newGlyphPosition(), // TODO: pick unique new position and size (auto-layout)
				y: height - 26 - this.axisThickness
			})
		);
		
		this.syncModelWithArtefact(
			'ContainsMaterial',
			a => a instanceof MaterialGlyph,
			this.inside.jq.children('.materials')[0],
			({model, width, height}) => new MaterialGlyph({
				model,
				x: this.newGlyphPosition(), // TODO: pick unique new position and size (auto-layout)
				y: height - 26 - this.axisThickness
			})
		);
		
		this.syncModelWithArtefact(
			'HasMeasurable',
			a => a instanceof MeasurableGlyph,
			this.inside.jq.children('.measurables')[0],
			({model, width, height}) => new MeasurableGlyph({
				model,
				x: this.newFarGlyphPosition(), // TODO: pick unique new position and size (auto-layout)
				y: height - 26 - this.axisThickness
			})
		);
		
		
		{
			const borderGroup = this.inside.jq.children('.borders');
			
			// TODO: rounded corners for bottom border if a lyph has no 'inner borders'
			
			let cornerTL = Snap(borderGroup[0]).path('M0,15a15,15 0 0,1 15,-15').attr({
				shapeRendering: 'geometricPrecision',
				fill:   'none',
				stroke: 'black',
				strokeWidth: 2
			});
			let cornerTR = Snap(borderGroup[0]).path('M0,15a15,15 0 0,0 -15,-15').attr({
				shapeRendering: 'geometricPrecision',
				fill:   'none',
				stroke: 'black',
				strokeWidth: 2
			});
			this.p(['width', 'hiddenOuterLayerLength']).subscribe(([width, hol])  => {
				cornerTR.node::setCTM(ID_MATRIX.translate(width, hol));
			});
			this.p('hiddenOuterLayerLength').subscribe((hol) => {
				cornerTL.node::setCTM(ID_MATRIX.translate(0, hol));
			});
			
			this.p([
				'leftBorder.model.nature',
				'rightBorder.model.nature',
			    'topBorder.isInnerBorder'
			]).subscribe(([ln, rn, isInner]) => {
				ln = ln::isArray() ? ln : [ln];
				rn = rn::isArray() ? rn : [rn];
				cornerTL.attr({ visibility: (isInner || ln.length === 1 && ln[0] === 'open') ? 'hidden' : 'visible' });
				cornerTR.attr({ visibility: (isInner || rn.length === 1 && rn[0] === 'open') ? 'hidden' : 'visible' });
			});
			
			this.leftBorder  = null;
			this.rightBorder = null;
			this.radialBorders.e('add').subscribe((borderLine) => {
				const removed = this.radialBorders.e('delete')::filter(b=>b===borderLine);
				borderGroup.append(borderLine.element);
				removed.subscribe(() => { borderLine.element.remove() });
				this.p(['height', 'spillunder'], _add)
					::subscribe_( borderLine.p('y2') , n=>n() );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					borderLine.resizes = { left: true };
					borderLine.x = 0;
					this.p(['leftCornerRadius', 'hiddenOuterLayerLength', 'spillover'], (cr, hol, so) => (cr + hol - so))
						::subscribe_( borderLine.p('y1'), v=>v() );
					removed.subscribe(() => { this.leftBorder = null });
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					borderLine.resizes = { right: true };
					this.p('width')::subscribe_( borderLine.p('x') , n=>n() );
					this.p(['rightCornerRadius', 'hiddenOuterLayerLength', 'spillover'], (cr, hol, so) => (cr + hol - so))
						::subscribe_( borderLine.p('y1'), v=>v() );
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
				
				if (!this.topBorder) {
					this.topBorder = borderLine;
					this.p(['leftCornerRadius'], (lcr) => lcr)
						::subscribe_( borderLine.p('x1') , v=>v() );
					this.p(['rightCornerRadius', 'width'], (rcr, w) => w-rcr)
						::subscribe_( borderLine.p('x2') , v=>v() );
					borderLine.resizes = { top: true };
					this.p('hiddenOuterLayerLength')::subscribe_( borderLine.p('y') , n=>n() );
					removed.subscribe(() => { this.topBorder = null });
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					this.p(['leftCornerRadius', 'free'], (lcr, free) => (free ? 0 : lcr))
						::subscribe_( borderLine.p('x1') , v=>v() );
					this.p(['rightCornerRadius', 'width', 'free'], (rcr, w, free) => (free ? w : w-rcr))
						::subscribe_( borderLine.p('x2') , v=>v() );
					borderLine.resizes = { bottom: true };
					this.p('height')::subscribe_( borderLine.p('y') , n=>n() );
					removed.subscribe(() => { this.bottomBorder = null });
				}
			});
		}
		
		
		if (this.showAxis) {
			const axisGroup = this.axis.svg.attr({
				pointerEvents: 'none'
			});
			
			const at = this.axisThickness;
			
			const background = axisGroup.rect().attr({
				stroke        : 'black',
				strokeWidth   : 2,
				fill          : 'black',
				shapeRendering: 'crispEdges',
				height        : at,
				x             : 0
			});
			this.p('height').subscribe(height => background.attr({ y: height - at }));
			this.p('width') .subscribe(width  => background.attr({ width }));
			
			const clipPath = axisGroup.rect().addClass('axis-clip-path').attr({
				height: at + 4,
				x:      at
			});
			const minusText = axisGroup.text().attr({
				textAnchor: 'middle',
				x:           at / 2
			});
			minusText.node.innerHTML='&minus;';
			const labelText = axisGroup.text().attr({
				textAnchor: 'middle',
				clip:        clipPath
			});
			const plusText = axisGroup.text().attr({
				text:       '+',
				textAnchor: 'middle'
			});
			const allText = axisGroup.selectAll('text').attr({
				fill            : 'white',
				fontSize        : `${at}px`,
				textRendering   : 'geometricPrecision',
				pointerEvents   : 'none',
				dominantBaseline: 'central',
			});
			
			this.p('width').subscribe((width) => {
				clipPath .attr({ width: width - 2*at });
				labelText.attr({ x: width/2          });
				plusText .attr({ x: width - at/2     });
			});
			
			this.p('height').subscribe((height) => {
				allText .attr({ y: height - at/2 });
				clipPath.attr({ y: height - at   });
			});
			
			this.model.p('name')::map(n=>({ text: n })).subscribe( ::labelText.attr );
		}
		
	}
	
	
	syncModelWithArtefact(relationship, artefactTest, parentElement, createNewArtefact) {
		/* new free-floating thing in the model --> new artifact */
		this.model[`-->${relationship}`].e('add')
			::filter(c => c.class === relationship)
			::map(c=>c[2])
			::withLatestFrom(this.p('width'), this.p('height'))
			::map(([model, width, height]) =>
				this[$$recycle](model) ||
				createNewArtefact({ model, width, height }))
			::tap((artefact) => { artefact.free = true })
			::subscribe_( this.freeFloatingStuff.e('add') , n=>n() );
		/* new part artifact --> house svg element */
		this.freeFloatingStuff.e('add')
		    ::filter(artefactTest)
		    .subscribe((artefact) => {
			    /* event when removed */
			    const removed = artefact.p('parent')::filter(parent => parent !== this);
		    	/* put into the dom */
				$(parentElement).append(artefact.element);
			    /* remove from dom when removed */
				removed.subscribe(() => {
					if (artefact.element.jq.parent()[0] === parentElement) {
						artefact.element.jq.remove();
					}
				});
			});
	}
	
	drop(droppedEntity, originalDropzone = this) {
		if (originalDropzone === this) {
			// dropped directly into this lyph rectangle
			if ([LyphRectangle, NodeGlyph, MeasurableGlyph, MaterialGlyph].includes(droppedEntity.constructor)) {
				this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
				if ([LyphRectangle].includes(droppedEntity.constructor)) {
					this.model.parts.add(droppedEntity.model)
				} else {
					this.freeFloatingStuff.add(droppedEntity, { force: true }); // TODO: split up
				}
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
			} else {
				return false;
			}
		}
	}
	
	//noinspection JSCheckFunctionSignatures
	p(...args) {
		switch (args[0]) {
			case 'layers': return this.layers.p('value');
			default:       return super.p(...args);
		}
		
	}
	
}

/* prepare element getters */
LyphRectangle.definePartGetter('axis');
LyphRectangle.definePartGetter('processLines');
