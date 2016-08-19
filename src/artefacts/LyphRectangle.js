import $          from '../libs/jquery.js';
import Snap, {gElement} from '../libs/snap.svg';

import pick     from 'lodash-bound/pick';
import defaults from 'lodash-bound/defaults';
import isNumber from 'lodash-bound/isNumber';
import size from 'lodash-bound/size';
import at from 'lodash-bound/at';
import assign from 'lodash-bound/assign';
import sortBy from 'lodash-bound/sortBy';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _add from 'lodash/add';
import _defer from 'lodash/defer';
import _zip from 'lodash/zip';

import uniqueId from 'lodash/uniqueId';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {of} from 'rxjs/observable/of';

import {merge} from 'rxjs/observable/merge';
import {map} from 'rxjs/operator/map';
import {filter} from 'rxjs/operator/filter';
import {pairwise} from 'rxjs/operator/pairwise';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {mergeMap} from 'rxjs/operator/mergeMap';
import {switchMap} from 'rxjs/operator/switchMap';
import {toPromise} from 'rxjs/operator/toPromise';
import {concat} from 'rxjs/operator/concat';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import BorderLine from './BorderLine';

import model from '../model';
import {subscribe_} from "../util/rxjs";
import {shiftedMovementFor, log} from "../util/rxjs";
import {flag} from "../util/ValueTracker";
import NodeGlyph from "./NodeGlyph";


const $$backgroundColor = Symbol('$$backgroundColor');
const $$toBeRecycled = Symbol('$$toBeRecycled');
const $$recycle = Symbol('$$recycle');
const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');


export default class LyphRectangle extends SvgEntity {
	
	@flag(true) free;
	
	@property({ isValid: _isNumber                                        }) x;
	@property({ isValid: _isNumber                                        }) y;
	@property({ isValid(w) { return w::isNumber() && w > this.minWidth  } }) width;
	@property({ isValid(h) { return h::isNumber() && h > this.minHeight } }) height;
	
	get axisThickness() { return this.model.axis ? 14 : 0 }
	
	get minWidth() { return 2 * (this.axisThickness + 1) }
	
	get minHeight() { return this.axisThickness + (this.model ? this.model.layers::size() * 2 : 5) }
	
	layers              = new ObservableSet();
	pureParts           = new ObservableSet();
	segments            = new ObservableSet();
	nodes               = new ObservableSet();
	
	radialBorders       = new ObservableSet();
	longitudinalBorders = new ObservableSet();
	
	@property() leftBorder;
	@property() rightBorder;
	@property() topBorder;
	@property() bottomBorder;
	
	constructor(options) {
		super(options);
		
		this.setFromObject(options, [
			'x', 'y', 'width', 'height'
		], { showAxis: !!this.model.axis });
		
		this[$$toBeRecycled] = new WeakMap();
		
		/* create the border artefacts */
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
			'pureParts',
			'radialBorders',
			'longitudinalBorders',
			'nodes'
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
		const group = gElement();
				
		const lyphRectangle = (() => {
			
			let shadow = group.rect().attr({
				filter: Snap('#svg').filter(Snap.filter.shadow(8, 8, 4, '#111111', 0.4)),
			});
			this.p(['free', 'dragging']).subscribe(([f, d]) => {
				shadow.attr({ visibility: (f && d ? 'visible' : 'hidden') })
			});
			
			let result = group.rect().attr({
				stroke        : 'none',
				fill          : this.model[$$backgroundColor],
				shapeRendering: 'crispEdges'
			});
			
			this.p('x').subscribe(x      => {
				result.attr({ x:x+1  });
				shadow.attr({ x:x+1  });
			});
			this.p('y').subscribe(y      => {
				result.attr({ y:y+1  });
				shadow.attr({ y:y+1  });
			});
			this.p('width').subscribe(width  => {
				result.attr({ width  });
				shadow.attr({ width  });
			});
			this.p('height').subscribe(height => {
				result.attr({ height });
				shadow.attr({ height });
			});
			
		})();
		
		const highlightedBorder = (() => {
			let result = gElement().g().attr({
				pointerEvents : 'none'
			});
			result.rect().attr({
				stroke:      'black',
				strokeWidth: '3px'
			});
			result.rect().attr({
				stroke:      'white',
				strokeWidth: '1px'
			});
			let rects = result.selectAll('rect').attr({
				fill:           'none',
				shapeRendering: 'crispEdges',
				pointerEvents : 'none'
			});
			
			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
				visibility: highlighted && !dragging ? 'visible' : 'hidden'
			})).subscribe( ::result.attr );
			
			this.p('x')     .subscribe((x)      => { rects.attr({ x:      x-3      }) });
			this.p('y')     .subscribe((y)      => { rects.attr({ y:      y-3      }) });
			this.p('width') .subscribe((width)  => { rects.attr({ width:  width+6  }) });
			this.p('height').subscribe((height) => { rects.attr({ height: height+6 }) });
			
			$('#foreground').append(result.node);
			
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
				height        :  at
			});
			this.p('x')            .subscribe(x             => background.attr({ x                  }));
			this.p(['y', 'height']).subscribe(([y, height]) => background.attr({ y: y + height - at }));
			this.p('width')        .subscribe(width         => background.attr({ width              }));
			
			const clipPath = result.rect().addClass('axis-clip-path').attr({
				height: at
			});
			const minusText = result.text().attr({
				textAnchor: 'middle'
			});
			minusText.node.innerHTML='&minus;';
			const labelText = result.text().attr({
				textAnchor: 'middle',
				clip:       clipPath
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
			
			this.p(['x', 'width']).subscribe(([x, width]) => {
				minusText.attr({ x: x + at/2         });
				labelText.attr({ x: x + width/2      });
				plusText .attr({ x: x + width - at/2 });
				clipPath .attr({
					x:     x + at,
					width: width - 2*at
				});
			});
			
			this.p(['y', 'height']).subscribe(([y, height]) => {
				allText .attr({ y: y + height - at/2 });
				clipPath.attr({ y: y + height - at   });
			});
			
			this.model.p('name').subscribe((n) => { labelText.attr({ text: n }) });
			
			return result;
			
		})();
		
		/* convenience function to use in partonomy setup */
		const takeUntilImNoLongerParent = (me => function takeUntilImNoLongerParent(a) {
			return this::takeUntil( a.p('parent')::filter(p => p !== me));
		})(this);
		
		
		group.g().addClass('layers');
		
		group.g().addClass('parts');
		group.g().addClass('nodes');
		
		// TODO: segments

		const borderGroup = (() => {
			const result = group.g().addClass('borders');
			
			this.leftBorder  = null;
			this.rightBorder = null;
			
			this.radialBorders.e('add').subscribe((borderLine) => {
				result.append(borderLine.element.svg);
				this.p('y')::subscribe_( borderLine.p('y1') , n=>n() );
				this.p(['y','height'], _add)::subscribe_( borderLine.p('y2') , n=>n() );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					this.p('x')::subscribe_( borderLine.p('x1') , n=>n() );
					this.p('x')::subscribe_( borderLine.p('x2') , n=>n() );
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					this.p(['x', 'width'], _add)::subscribe_( borderLine.p('x1') , n=>n() );
					this.p(['x', 'width'], _add)::subscribe_( borderLine.p('x2') , n=>n() );
				}
			});
			this.radialBorders.e('delete').subscribe((borderLine) => {
				if      (borderLine === this.leftBorder)  { this.leftBorder  = null }
				else if (borderLine === this.rightBorder) { this.rightBorder = null }
				borderLine.element.remove();
			}); // TODO: proper deleting
			
			
			this.topBorder    = null;
			this.bottomBorder = null; // also axis
			
			this.longitudinalBorders.e('add').subscribe((borderLine) => {
				result.append(borderLine.element.svg);
				this.p('x')::subscribe_( borderLine.p('x1') , n=>n() );
				this.p(['x','width'], _add)::subscribe_( borderLine.p('x2') , n=>n() );
				if (!this.topBorder) {
					this.topBorder = borderLine;
					this.p('y')::subscribe_( borderLine.p('y1') , n=>n() );
					this.p('y')::subscribe_( borderLine.p('y2') , n=>n() );
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					this.p(['y', 'height'], _add)::subscribe_( borderLine.p('y1') , n=>n() );
					this.p(['y', 'height'], _add)::subscribe_( borderLine.p('y2') , n=>n() );
				}
			});
			this.longitudinalBorders.e('delete').subscribe((borderLine) => {
				if      (borderLine === this.topBorder)    { this.topBorder    = null }
				else if (borderLine === this.bottomBorder) { this.bottomBorder = null }
				borderLine.element.remove();
			}); // TODO: proper deleting
			
		})();
		
		/* return representation(s) of element */
		return {
			element: group.node
		};
	}
	
	
	[$$recycle](model) {
		if (!this[$$toBeRecycled].has(model)) { return false }
		let result = this[$$toBeRecycled].get(model);
		this[$$toBeRecycled].delete(model);
		return result;
	}
	
	async afterCreateElement() {
		super.afterCreateElement();
		
		/* wait until we have some coordinates */
		await this.p(['x','y','width','height'])::take(1)::toPromise();
		
		/* new layer in the model --> new layer artifact */
		this[$$relativeLayerPosition] = new WeakMap();
		this.model['-->HasLayer'].e('add')
			::map(rel => ({ layer: rel[2], relativePosition: rel.p('relativePosition') }))
			::map(({layer, relativePosition}) => {
				let layerBox = this[$$recycle](layer) || new LyphRectangle({
					parent  : this,
					model   : layer,
					showAxis: false,
					free    : false
				});
				this[$$relativeLayerPosition].set(layerBox, relativePosition);
				return layerBox;
			})
			::subscribe_( this.layers.e('add') , n=>n() );
		
		/* new layer artifact --> house svg element */
		this.layers.e('add').subscribe((layer) => {
			this.inside.jq.children('.layers').append(layer.element);
			const removed = layer.p('parent')::filter(parent=>parent!==this);
			removed.subscribe(() => {
				if (layer.element.jq.parent()[0] === this.element) {
					layer.element.jq.remove();
				}
			});
		});
		
		/* new layer artifact --> move it together with its parent */
		this.layers.p('value')
			::map(layers => [...layers])
			::map((layers) => ({
				dimensions:        this.pObj(['x', 'y', 'width', 'height']),
				layers:            layers,
				relativePositions: layers.map(::this[$$relativeLayerPosition].get)
			}))
			::switchMap(
				({dimensions, relativePositions}) => combineLatest(dimensions, relativePositions),
				({layers}, [{width, height, x, y}, relativePositions]) => ({
					layers: layers::sortBy((l, i) => relativePositions[i]),
					wh_layer: {
						width:   width,
						height: (height - this.axisThickness) / layers.length
					},
					xy_parent: {x, y}
				}))
			.subscribe(({layers, wh_layer: {width, height}, xy_parent: {x, y}}) => {
				// console.log(Object.entries(layers));
				for (let i = 0; i < layers.length; ++i) {
					const layer = layers[i];
					layer::assign({
						width,
						height,
						x,
						y: y + i * height
					});
				}
			});
		
		
		/* new part in the model --> new part artifact */
		this.model['-->HasPart'].e('add')
			::filter(c => c.class === 'HasPart')
			::map(c=>c[2])
			::withLatestFrom(this.p('x'),this.p('y'),this.p('width'),this.p('height'))
			::map(([part, x, y, width, height]) => this[$$recycle](part) || new LyphRectangle({
				model : part,
				x     : x + 5,
				y     : y + 5,
				width : width / 2,
				height: height / 2
			}))
			.do((artefact) => { artefact.free = true })
			::subscribe_( this.pureParts.e('add') , n=>n() );
		
		/* new part artifact --> house svg element + move it together with its parent */
		this.pureParts.e('add').subscribe((part) => {
			this.inside.jq.children('.parts').append(part.element);
			const removed = part.p('parent')::filter(parent=>parent!==this);
			
			this.pObj(['x', 'y'])
				::takeUntil(removed)
				::shiftedMovementFor(part.pObj(['x', 'y']))
				.subscribe( part::assign );
			
			removed.subscribe(() => {
				if (part.element.jq.parent()[0] === this.element) {
					part.element.jq.remove();
				}
			});
		});
		
		
		/* new node in the model --> new node artifact */
		this.model['-->ContainsNode'].e('add')
			::map(c=>c[2])
			::withLatestFrom(this.p('x'),this.p('y'))
			::map(([node, x, y]) => this[$$recycle](node) || new NodeGlyph({
				model : node,
				x     : x + 5,
				y     : y + 5
			}))
			.do((artefact) => { artefact.free = true })
			::subscribe_( this.nodes.e('add') , n=>n() );
		
		/* new node artifact --> house svg element + move it together with its parent */
		this.nodes.e('add').subscribe((node) => {
			this.inside.jq.children('.nodes').append(node.element);
			const removed = node.p('parent')::filter(parent=>parent!==this);
			
			this.pObj(['x', 'y'])
				::takeUntil(removed)
				::shiftedMovementFor(node.pObj(['x', 'y']))
				.subscribe( node::assign );
			
			removed.subscribe(() => {
				if (node.element.jq.parent()[0] === this.element) {
					node.element.jq.remove();
				}
			});
		});
		
	}
	
	get draggable() { return true }
	
	drop(droppedEntity) {
		if (model.classes.Lyph.hasInstance(droppedEntity.model)) { // if a lyph artefact was dropped
			this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
			droppedEntity.model.parent = null;
			// this.model.children.delete(droppedEntity.model);
			this.model.parts.add(droppedEntity.model);
		}
	}
	
}


// export default class LyphRectangle extends SvgEntity {
//
// 	@property({                                          }) x;
// 	@property({                                          }) y;
// 	@property({ isValid(w) { return w > this.minWidth  } }) width;
// 	@property({ isValid(h) { return h > this.minHeight } }) height;
//
// 	get axisThickness() { return this.model.layers.length > 0 ? 10 : 0                                }
// 	get minWidth     () { return 2 * (this.axisThickness + 1)                                         }
// 	get minHeight    () { return this.axisThickness + (this.model ? this.model.layers.length * 2 : 5) }
//
// 	layers = [];
//
// 	constructor(options) {
// 		super(options);
//
// 		this.setFromObject(options, {
// 			showAxis: true
// 		});
//
// 		/* create the layer template boxes */ // TODO: sort by border-shared nodes
// 		this.layers = [...this.model.layers].map(layer => new LyphRectangle({
// 			parent:     this,
// 			model:      layer,
// 			showAxis:   false
// 		}));
//
// 		/* create a random color (one per layer, stored in the model) */
// 		if (!this.model[$$backgroundColor]) {
// 			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
// 		}
// 	}
//
// 	createElement() {
// 		/* main HTML */
// 		let clipPathId = uniqueId('clip-path');
// 		let result = $.svg(`
// 			<g>
// 				<rect class="lyphRectangle"></rect>
// 				<svg class="axis">
// 					<defs>
// 						<clipPath id="${clipPathId}">
// 							<rect x="0" y="0" height="100%" width="100%"></rect>
// 						</clipPath>
// 					</defs>
// 					<rect class="axis-background" x="0" y="0" height="100%" width="100%"></rect>
// 					<svg class="text-area">
// 						<text class="minus" stroke="white"> - </text>
// 						<text class="label" stroke="none" clip-path="url(#${clipPathId})"> ${this.model.name} </text>
// 						<text class="plus " stroke="white"> + </text>
// 					</svg>
// 				</svg>
// 				<g class="child-container"></g>
// 			</g>
// 		`);
//
// 		/* extract and style important elements */
// 		const lyphRectangle = result.find('.lyphRectangle').css({
// 			stroke:         'black',
// 			fill:           this.model[$$backgroundColor],
// 			shapeRendering: 'crispEdges',
// 			pointerEvents:  'all'
// 		});
// 		const axis = result.find('svg.axis').css({
// 			stroke:         'black',
// 			fill:           'black',
// 			shapeRendering: 'crispEdges',
// 			pointerEvents:  'none',
// 			overflow:       'visible'
// 		});
// 		const textArea = axis.children('svg.text-area').css({
// 			stroke:         'black',
// 			fill:           'black',
// 			shapeRendering: 'crispEdges',
// 			pointerEvents:  'none',
// 			overflow:       'hidden'
// 		});
// 		axis.children('.axis-background').css({
// 			stroke:         'black',
// 			fill:           'black',
// 			shapeRendering: 'crispEdges'
// 		});
// 		const axisText = textArea.children('text').css({
// 			fill:             'white',
// 			fontSize:         `14px`,
// 			textRendering:    'geometricPrecision',
// 			pointerEvents:    'none',
// 			dominantBaseline: 'central'
// 		});
//
// 		/* add layer template boxes */
// 		for (let lTBox of this.layers) {
// 			result.children('.child-container').append(lTBox.element);
// 		}
//
// 		/* react to dimension changes */
// 		const at = this.axisThickness;
// 		let dimensioning = this.p(['x', 'y', 'width', 'height'], [], (x, y, width, height) => ({ x, y, width, height, tX: 0, tY: 4, tWidth: at,      tHeight: height, minusX: '50%',  minusY: '0%',   labelX: '50%', labelY: '50%', plusX: '50%',  plusY: '100%', minusAnchor: 'start', labelAnchor: 'middle', plusAnchor: 'end',   writingMode: 'vertical-rl'   }));
// 		dimensioning.subscribe((d) => {
//
// 			lyphRectangle.attr('x',  d.x );
// 			lyphRectangle.attr('y', d.y);
// 			lyphRectangle.attr('width',  d.width );
// 			lyphRectangle.attr('height', d.height);
//
// 			axis.attr('x',      d.x     );
// 			axis.attr('y',      d.y     );
// 			axis.attr('width',  at );
// 			axis.attr('height', d.height);
//
// 			textArea.attr('x',      d.tX     );
// 			textArea.attr('y',      d.tY     );
// 			textArea.attr('width',  d.tWidth );
// 			textArea.attr('height', d.tHeight);
//
// 			axisText.attr('writing-mode', d.writingMode);
//
// 			axisText.filter('.minus').attr('x', d.minusX);
// 			axisText.filter('.minus').attr('y', d.minusY);
// 			axisText.filter('.minus').attr('text-anchor', d.minusAnchor);
//
// 			axisText.filter('.label').attr('x', d.labelX);
// 			axisText.filter('.label').attr('y', d.labelY);
// 			axisText.filter('.label').attr('text-anchor', d.labelAnchor);
//
// 			axisText.filter('.plus').attr('x', d.plusX);
// 			axisText.filter('.plus').attr('y', d.plusY);
// 			axisText.filter('.plus').attr('text-anchor', d.plusAnchor);
//
// 			let layerCount = this.layers.length;
// 			let layerWidth = (d.width - at) / layerCount;
// 			for (let i = 0; i < layerCount; ++i) {
// 				let box = this.layers[i];
// 				box.x = d.x + at + i * layerWidth;
// 				box.y = d.y;
// 				box.width = layerWidth;
// 				box.height = d.height;
// 			}
// 		});
//
// 		/* return result */
// 		return result;
// 	}
//
// 	// plugContainerPositioning() {
// 	// 	let containerDims = this.xywhr.map(({x, y, width, height, rotation}) => sw(rotation)({
// 	// 		0: {
// 	// 			cx:      x,
// 	// 			cy:      y,
// 	// 			cwidth:  width,
// 	// 			cheight: height - this.axisThickness
// 	// 		},
// 	// 		90: {
// 	// 			cx:      x + this.axisThickness,
// 	// 			cy:      y,
// 	// 			cwidth:  width - this.axisThickness,
// 	// 			cheight: height
// 	// 		},
// 	// 		180: {
// 	// 			cx:      x,
// 	// 			cy:      y + this.axisThickness,
// 	// 			cwidth:  width,
// 	// 			cheight: height - this.axisThickness
// 	// 		},
// 	// 		270: {
// 	// 			cx:      x,
// 	// 			cy:      y,
// 	// 			cwidth:  width - this.axisThickness,
// 	// 			cheight: height
// 	// 		}
// 	// 	}));
// 	// 	this.p('cx')     .plug(containerDims.map(get('cx'))     );
// 	// 	this.p('cy')     .plug(containerDims.map(get('cy'))     );
// 	// 	this.p('cwidth') .plug(containerDims.map(get('cwidth')) );
// 	// 	this.p('cheight').plug(containerDims.map(get('cheight')));
// 	// }
//
// 	// draggable() {
// 	// 	let raw;//, rootRect;
// 	// 	return {
// 	// 		autoScroll: true,
// 	// 		onstart: (event) => { // TODO: make streams for these events somewhere up the class hierarchy
// 	// 			event.stopPropagation();
// 	// 			this.moveToFront();
// 	//
// 	// 			/* initialize interaction-local variables */
// 	// 			raw = pick(this, 'x', 'y');
// 	// 			// rootRect = this.root.boundingBox();
// 	// 		},
// 	// 		onmove: ({dx, dy}) => {
// 	// 			/* update raw coordinates */
// 	// 			raw.x += dx;
// 	// 			raw.y += dy;
// 	//
// 	// 			/* initialize visible coordinates */
// 	// 			let visible = clone(raw);
// 	//
// 	// 			// TODO: snapping
// 	//
// 	// 			/* restriction correction */
// 	// 			visible.x = clamp( this.root.cx, this.root.cx + this.root.cwidth  - this.width  )( visible.x );
// 	// 			visible.y = clamp( this.root.cy, this.root.cy + this.root.cheight - this.height )( visible.y );
// 	//
// 	// 			/* set the actual visible coordinates */
// 	// 			Object.assign(this, visible);
// 	// 		}
// 	// 	};
// 	// }
//
// 	// resizable() {
// 	// 	let raw;
// 	// 	return {
// 	// 		handle: '.lyphRectangle',
// 	// 		edges: { left: true, right: true, bottom: true, top: true },
// 	// 		onstart: (event) => {
// 	// 			event.stopPropagation();
// 	// 			this.moveToFront();
// 	//
// 	// 			/* initialize interaction-local variables */
// 	// 			raw  = pick(this, 'x', 'y', 'width', 'height');
// 	// 		},
// 	// 		onmove: ({rect, edges, ctrlKey}) => {
// 	//
// 	// 			/* update raw coordinates */
// 	// 			raw.width  = Math.max(rect.width,  this.minWidth );
// 	// 			raw.height = Math.max(rect.height, this.minHeight);
// 	//
// 	// 			/* maintain aspect ratio */
// 	// 			if (ctrlKey) {
// 	// 				let correctedSize = this.model.maintainRepresentativeAspectRatio(raw);
// 	// 				if (correctedSize) { Object.assign(raw, correctedSize) }
// 	// 			}
// 	//
// 	// 			/* correct for left and top edge dragging */
// 	// 			if (edges.left) { raw.x = rect.left - (raw.width  - rect.width ) }
// 	// 			if (edges.top)  { raw.y = rect.top  - (raw.height - rect.height) }
// 	//
// 	// 			/* initialize visible coordinates */
// 	// 			let visible = clone(raw);
// 	//
// 	// 			// TODO: snapping
// 	//
// 	// 			/* restriction correction */
// 	// 			if (edges.left && visible.x < this.parent.cx) {
// 	// 				visible.width = (visible.x + visible.width) - this.parent.cx;
// 	// 				visible.x = this.parent.cx;
// 	// 			}
// 	// 			if (edges.top && visible.y < this.parent.cy) {
// 	// 				visible.height = (visible.y + visible.height) - this.parent.cy;
// 	// 				visible.y = this.parent.cy;
// 	// 			}
// 	// 			if (edges.right && visible.x + visible.width > this.parent.cx + this.parent.cwidth) {
// 	// 				visible.width = (this.parent.cx + this.parent.cwidth) - visible.x;
// 	// 			}
// 	// 			if (edges.bottom && visible.y + visible.height > this.parent.cy + this.parent.cheight) {
// 	// 				visible.height = (this.parent.cy + this.parent.cheight) - visible.y;
// 	// 			}
// 	//
// 	// 			/* set visible (x, y) based on snapping and restriction */
// 	// 			this.set(visible);
// 	// 		}
// 	// 	};
// 	// }
//
// }
