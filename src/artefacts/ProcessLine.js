import $          from '../libs/jquery.js';
import Snap, {gElement} from '../libs/snap.svg';

import pick     from 'lodash-bound/pick';
import defaults from 'lodash-bound/defaults';
import isNumber from 'lodash-bound/isNumber';
import size from 'lodash-bound/size';
import at from 'lodash-bound/at';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _defer from 'lodash/defer'

import uniqueId from 'lodash/uniqueId';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operator/map';
import {take} from 'rxjs/operator/take';
import {filter} from 'rxjs/operator/filter';
import {switchMap} from 'rxjs/operator/switchMap';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import {flag} from "../util/ValueTracker";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class ProcessLine extends SvgEntity {
	
	@property() source;
	@property() target;
	
	toString() { return `[${this.constructor.name}]` }
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'source', 'target'
		], { free: false });
	}
	
	createElement() {
		
		const group = gElement();
		
		let line = group.line().attr({
			strokeWidth  : '3px',
			stroke       : 'red',
			pointerEvents: 'none',
			strokeLinecap: 'round'
		});
		
		this.p('source')::filter(n=>n)::switchMap(n=>n.p('x')).subscribe((x) => { line.attr({ x1: x  }) });
		this.p('source')::filter(n=>n)::switchMap(n=>n.p('y')).subscribe((y) => { line.attr({ y1: y  }) });
		this.p('target')::filter(n=>n)::switchMap(n=>n.p('x')).subscribe((x) => { line.attr({ x2: x  }) });
		this.p('target')::filter(n=>n)::switchMap(n=>n.p('y')).subscribe((y) => { line.attr({ y2: y  }) });
		
		/* return representation(s) of element */
		return {
			element: group.node
		};
		
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		this.root.inside.jq.children('.foreground').append(this.element);
	}
	
	get draggable() { return false }
	
	drop(droppedEntity) {
		// TODO
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
