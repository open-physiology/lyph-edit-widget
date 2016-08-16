import $          from '../libs/jquery.js';
import Snap, {gElement} from '../libs/snap.svg';

import pick     from 'lodash-bound/pick';
import defaults from 'lodash-bound/defaults';
import isNumber from 'lodash-bound/isNumber';
import size from 'lodash-bound/size';
import at from 'lodash-bound/at';
import assign from 'lodash-bound/assign';

import _isNumber from 'lodash/isNumber';
import _isBoolean from 'lodash/isBoolean';
import _add from 'lodash/add';
import _defer from 'lodash/defer';

import uniqueId from 'lodash/uniqueId';

import {map} from 'rxjs/operator/map';
import {filter} from 'rxjs/operator/filter';
import {pairwise} from 'rxjs/operator/pairwise';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import BorderLine from "./BorderLine";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class LyphRectangle extends SvgEntity {
	
	@property({ isValid: _isNumber                                        }) x;
	@property({ isValid: _isNumber                                        }) y;
	@property({ isValid(w) { return w::isNumber() && w > this.minWidth  } }) width;
	@property({ isValid(h) { return h::isNumber() && h > this.minHeight } }) height;
	
	get axisThickness() { return this.model.axis ? 14 : 0 }
	
	get minWidth() { return 2 * (this.axisThickness + 1) }
	
	get minHeight() { return this.axisThickness + (this.model ? this.model.layers::size() * 2 : 5) }
	
	layers              = new ObservableSet();
	parts               = new ObservableSet();
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
		], {
			showAxis: !!this.model.axis
		});
		
		/* create the layer template boxes */ // TODO: sort
		this.model.layers.e('add')::map(layer => new LyphRectangle({
			parent  : this,
			model   : layer,
			showAxis: false,
			free    : false
		})).subscribe( this.layers.e('add') );
		
		/* create the part template boxes */ // TODO: sort
		combineLatest(
			this.model.parts.e('add')::filter(c => !this.model.layers.has(c) && !this.model.patches.has(c)),
			this.p(['x','y','width','height'])::take(1),
			(part, [x, y, width, height]) => new LyphRectangle({
				parent  : this,
				model   : part,
				free    : true,
				x       : x+5,
				y       : y+5,
				width   : width  / 2,
				height  : height / 2
			})
		).subscribe( this.parts.e('add') );
		// this.model.parts.e('add')
		// 	::filter(c => !this.model.layers.has(c) && !this.model.patches.has(c))
		// 	.do((v) => { console.log('(1)', v) })
		// 	::withLatestFrom(this.p(['x','y','width','height']), (part, [x, y, width, height]) => {
		//
		// 		console.log(part, [x, y, width, height]);
		//
		// 		return new LyphRectangle({
		// 			parent  : this,
		// 			model   : part,
		// 			free    : true,
		// 			x       : x+5,
		// 			y       : y+5,
		// 			width   : width  / 2,
		// 			height  : height / 2
		// 		});
		// 	})
		// 	.do((v) => { console.log('(2)', v) })
		// 	.subscribe( this.parts.e('add') );
		
		/* create the border artefacts */
		for (let key of ['radialBorders', 'longitudinalBorders']) {
			this.model[key].e('add')::map(border => new BorderLine({
				parent  : this,
				model   : border,
				free    : false,
				movable : this.free
			})).subscribe( this[key].e('add') );
		} // TODO: need a way to distinguish plus/minus + inner/outer borders
		
		/* create a random color (one per layer, stored in the model) */
		if (!this.model[$$backgroundColor]) {
			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
		}
		
	}
	
	createElement() {
		
		const at = this.axisThickness;
		
		const group = gElement();
		
		const lyphRectangle = (()=> {
			let result = group.rect().attr({
				stroke        : 'none',
				fill          : this.model[$$backgroundColor],
				shapeRendering: 'crispEdges'
			});
			
			this.p('x'     ).subscribe(x      => result.attr({ x:x+1  }));
			this.p('y'     ).subscribe(y      => result.attr({ y:y+1  }));
			this.p('width' ).subscribe(width  => result.attr({ width  }));
			this.p('height').subscribe(height => result.attr({ height }));
			
			return result;
		})();
		
		const highlightedBorder = (()=>{
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
			
			const result = group.g().attr({
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
			
			const clipPath = result.rect().attr({
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
		
		{
			const layerGroup = group.g();
			
			const layerCount = this.layers.p('value')::map(s => s::size());
			
			let i = 0;
			
			const layerHeight = combineLatest(this.p('height'), layerCount, (height, count) => (height-at)/count);
			
			this.layers.e('add').subscribe((layerRectangle) => {
				const position = i++; // TODO: store layer position and use that
				layerGroup.append(layerRectangle.svg);
				this.p('x')    .subscribe(layerRectangle.p('x')    );
				this.p('width').subscribe(layerRectangle.p('width'));
				combineLatest(this.p('y'), layerHeight, (y, lHeight) => y + position * lHeight)
					.subscribe( layerRectangle.p('y') );
				layerHeight.subscribe(layerRectangle.p('height'));
			});
			this.layers.e('delete').subscribe((layerRectangle) => {
				layerRectangle.element.remove();
			});
		}
		
		const partGroup = (()=>{
			const result = group.g();
			this.parts.e('add').subscribe((partRectangle) => {
				result.append(partRectangle.svg);
				for (let dim of ['x', 'y']) {
					this.p(dim)
						::pairwise()::map(([prev,curr])=>(curr-prev)/2) // Why do we need to divide by 2?
						::withLatestFrom(partRectangle.p(dim), _add)
						.subscribe( partRectangle.p(dim) );
				}
			});
			this.parts.e('delete').subscribe((partRectangle) => {
				partRectangle.element.remove();
			});
			return result;
		})();

		{
			const borderGroup = group.g();
			
			this.leftBorder  = null;
			this.rightBorder = null;
			
			this.radialBorders.e('add').subscribe((borderLine) => {
				borderGroup.append(borderLine.svg);
				this.p('y').subscribe( borderLine.p('y1') );
				this.p(['y','height'], _add).subscribe( borderLine.p('y2') );
				if (!this.leftBorder) {
					this.leftBorder = borderLine;
					this.p('x').subscribe( borderLine.p('x1') );
					this.p('x').subscribe( borderLine.p('x2') );
				} else if (!this.rightBorder) {
					this.rightBorder = borderLine;
					this.p(['x', 'width'], _add).subscribe( borderLine.p('x1') );
					this.p(['x', 'width'], _add).subscribe( borderLine.p('x2') );
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
				borderGroup.append(borderLine.svg);
				this.p('x').subscribe( borderLine.p('x1') );
				this.p(['x','width'], _add).subscribe( borderLine.p('x2') );
				if (!this.topBorder) {
					this.topBorder = borderLine;
					this.p('y').subscribe( borderLine.p('y1') );
					this.p('y').subscribe( borderLine.p('y2') );
				} else if (!this.bottomBorder) {
					this.bottomBorder = borderLine;
					this.p(['y', 'height'], _add).subscribe( borderLine.p('y1') );
					this.p(['y', 'height'], _add).subscribe( borderLine.p('y2') );
				}
			});
			this.longitudinalBorders.e('delete').subscribe((borderLine) => {
				if      (borderLine === this.topBorder)    { this.topBorder    = null }
				else if (borderLine === this.bottomBorder) { this.bottomBorder = null }
				borderLine.element.remove();
			}); // TODO: proper deleting
			
		}
		
		/* manage 'dragging' property */
		this.p('dragging').subscribe((dragging) => {
			group.attr({
				pointerEvents: dragging ? 'none' : 'visiblePainted',
				opacity:       dragging ?  0.8   :  1
			});
		});
		
		/* return representation(s) of element */
		return {
			svg: group
		};
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
