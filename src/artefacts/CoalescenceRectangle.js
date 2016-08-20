// import $          from '../libs/jquery.js';
// import Snap, {gElement} from '../libs/snap.svg';
//
// import pick     from 'lodash-bound/pick';
// import defaults from 'lodash-bound/defaults';
// import isNumber from 'lodash-bound/isNumber';
// import size from 'lodash-bound/size';
// import at from 'lodash-bound/at';
// import assign from 'lodash-bound/assign';
// import sortBy from 'lodash-bound/sortBy';
// import maxBy from 'lodash-bound/maxBy';
// import max from 'lodash-bound/max';
// import ldMap from 'lodash-bound/map';
//
// import _isNumber from 'lodash/isNumber';
// import _isBoolean from 'lodash/isBoolean';
// import _add from 'lodash/add';
// import _defer from 'lodash/defer';
// import _zip from 'lodash/zip';
//
// import uniqueId from 'lodash/uniqueId';
//
// import {combineLatest} from 'rxjs/observable/combineLatest';
// import {of} from 'rxjs/observable/of';
//
// // import {map} from '../util/bound-hybrid-functions';
//
// import {merge} from 'rxjs/observable/merge';
// import {range} from 'rxjs/observable/range';
// import {interval} from 'rxjs/observable/interval';
//
// import {sampleTime} from 'rxjs/operator/sampleTime';
// import {filter} from 'rxjs/operator/filter';
// import {pairwise} from 'rxjs/operator/pairwise';
// import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
// import {take} from 'rxjs/operator/take';
// import {takeUntil} from 'rxjs/operator/takeUntil';
// import {mergeMap} from 'rxjs/operator/mergeMap';
// import {switchMap} from 'rxjs/operator/switchMap';
// import {toPromise} from 'rxjs/operator/toPromise';
// import {concat} from 'rxjs/operator/concat';
// import {map} from 'rxjs/operator/map';
//
// import chroma from '../libs/chroma.js';
//
// import SvgEntity from './SvgEntity.js';
//
// import {property} from '../util/ValueTracker.js';
// import ObservableSet, {copySetContent} from "../util/ObservableSet";
// import BorderLine from './BorderLine';
//
// import '../model'; // sets a global (for now)
// import {subscribe_} from "../util/rxjs";
// import {shiftedMovementFor, log} from "../util/rxjs";
// import {flag} from "../util/ValueTracker";
// import NodeGlyph from "./NodeGlyph";
//
//
// const $$backgroundColor = Symbol('$$backgroundColor');
// const $$toBeRecycled = Symbol('$$toBeRecycled');
// const $$recycle = Symbol('$$recycle');
// const $$relativeLayerPosition = Symbol('$$relativeLayerPosition');
//
//
// export default class LyphRectangle extends SvgEntity {
//
// 	@flag(true) free;
//
// 	@property({ isValid: _isNumber                                        }) x;
// 	@property({ isValid: _isNumber                                        }) y;
// 	@property({ isValid(w) { return w::isNumber() && w > this.minWidth  } }) width;
// 	@property({ isValid(h) { return h::isNumber() && h > this.minHeight } }) height;
// 	@property({ isValid(r) { return r::isNumber() }, initial: 0           }) rotation;
//
//
// 	@property({  }) gTransform; // local --> global
//
//
// 	get axisThickness() { return this.model.axis && this.showAxis ? 14 : 0 }
//
// 	get minWidth() { return 2 * ((this.axisThickness && this.showAxis) + 1) }
//
// 	get minHeight() { return (this.axisThickness && this.showAxis) + (this.model ? this.model.layers::size() * 2 : 5) }
//
// 	segments            = new ObservableSet();
// 	layers              = new ObservableSet();
//
// 	freeFloatingStuff   = new ObservableSet();
//
// 	radialBorders       = new ObservableSet();
// 	longitudinalBorders = new ObservableSet();
//
// 	@property() leftBorder;
// 	@property() rightBorder;
// 	@property() topBorder;
// 	@property() bottomBorder;
//
// 	constructor(options) {
// 		super(options);
//
// 		this.setFromObject(options, [
// 			'x', 'y', 'width', 'height', 'rotation'
// 		], { showAxis: !!this.model.axis });
//
// 		this[$$toBeRecycled] = new WeakMap();
//
// 		/* create the border artifacts */
// 		for (let setKey of ['radialBorders', 'longitudinalBorders']) {
// 			this.model[setKey].e('add')::map(border => this[$$recycle](border) || new BorderLine({
// 				parent : this,
// 				model  : border,
// 				movable: this.free
// 			}))::subscribe_( this[setKey].e('add') , n=>n() );
// 		}
//
// 		for (let setKey of [
// 			'layers',
// 			'segments',
// 			'radialBorders',
// 			'longitudinalBorders'
// 		]) {
// 			this[setKey].e('add')::subscribe_( this.children.e('add') , n=>n() );
// 			this.children.e('delete')::subscribe_( this[setKey].e('delete') , n=>n() );
// 		}
//
// 		/* create a random color (one per layer, stored in the model) */
// 		if (!this.model[$$backgroundColor]) {
// 			this.model[$$backgroundColor] = chroma.randomHsvGolden(0.8, 0.8);
// 		}
//
// 	}
//
// 	createElement() {
// 		const at = this.axisThickness;
// 		const group = gElement();
//
//
// 		this.p(['rotation', 'x', 'y', 'width', 'height'],
// 				(r, x, y, w, h) => `R${r},${x+w/2},${y+h/2}`)
// 		    .subscribe( ::group.transform );
//
//
// 		const lyphRectangle = (() => {
//
// 			let shadow = group.rect().attr({
// 				filter: Snap('#svg').filter(Snap.filter.shadow(8, 8, 4, '#111111', 0.4)),
// 			});
// 			this.p(['free', 'dragging']).subscribe(([f, d]) => {
// 				shadow.attr({ visibility: (f && d ? 'visible' : 'hidden') })
// 			});
//
// 			let result = group.rect().attr({
// 				stroke        : 'none',
// 				fill          : this.model[$$backgroundColor],
// 				shapeRendering: 'crispEdges'
// 			});
//
// 			this.p('x').subscribe(x      => {
// 				result.attr({ x  });
// 				shadow.attr({ x  });
// 			});
// 			this.p('y').subscribe(y      => {
// 				result.attr({ y  });
// 				shadow.attr({ y  });
// 			});
// 			this.p('width').subscribe(width  => {
// 				result.attr({ width  });
// 				shadow.attr({ width  });
// 			});
// 			this.p('height').subscribe(height => {
// 				result.attr({ height });
// 				shadow.attr({ height });
// 			});
//
// 		})();
//
// 		const highlightedBorder = (() => {
// 			let result = gElement().g().attr({
// 				pointerEvents : 'none'
// 			});
//
// 			this.p('gTransform')::map(m=>m.toTransformString())
// 			    .subscribe( ::result.transform );
//
// 			result.rect().attr({
// 				stroke:      'black',
// 				strokeWidth: '3px'
// 			});
// 			result.rect().attr({
// 				stroke:      'white',
// 				strokeWidth: '1px'
// 			});
// 			let rects = result.selectAll('rect').attr({
// 				fill:            'none',
// 				shapeRendering:  'crispEdges',
// 				pointerEvents :  'none',
// 				strokeDasharray: '8, 5', // 13
// 				strokeDashoffset: 0
// 			});
// 			interval(1000/60)
// 				::map(n => ({ strokeDashoffset: -(n / 3 % 13) }))
// 				.subscribe( ::rects.attr );
//
//
// 			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
// 				visibility: highlighted && !dragging ? 'visible' : 'hidden'
// 			})).subscribe( ::result.attr );
//
// 			this.p('x')     .subscribe((x)      => { rects.attr({ x:      x-4      }) });
// 			this.p('y')     .subscribe((y)      => { rects.attr({ y:      y-4      }) });
// 			this.p('width') .subscribe((width)  => { rects.attr({ width:  width+7  }) });
// 			this.p('height').subscribe((height) => { rects.attr({ height: height+7 }) });
//
// 			$('#foreground').append(result.node);
//
// 			return result.node;
// 		})();
//
// 		const axis = (() => {
//
// 			if (!this.showAxis) { return null }
//
// 			const result = group.g().addClass('axis').attr({
// 				pointerEvents: 'none'
// 			});
//
// 			const background = result.rect().attr({
// 				stroke        : 'black',
// 				fill          : 'black',
// 				shapeRendering: 'crispEdges',
// 				height        :  at
// 			});
// 			this.p('x')            .subscribe(x             => background.attr({ x: x               }));
// 			this.p(['y', 'height']).subscribe(([y, height]) => background.attr({ y: y + height - at }));
// 			this.p('width')        .subscribe(width         => background.attr({ width: width       }));
//
// 			const clipPath = result.rect().addClass('axis-clip-path').attr({
// 				height: at
// 			});
// 			const minusText = result.text().attr({
// 				textAnchor: 'middle'
// 			});
// 			minusText.node.innerHTML='&minus;';
// 			const labelText = result.text().attr({
// 				textAnchor: 'middle',
// 				clip:       clipPath
// 			});
// 			const plusText = result.text().attr({
// 				text:       '+',
// 				textAnchor: 'middle'
// 			});
// 			const allText = group.selectAll('text').attr({
// 				fill            : 'white',
// 				fontSize        : `${at}px`,
// 				textRendering   : 'geometricPrecision',
// 				pointerEvents   : 'none',
// 				dominantBaseline: 'central',
// 			});
//
// 			this.p(['x', 'width']).subscribe(([x, width]) => {
// 				minusText.attr({ x: x + at/2         });
// 				labelText.attr({ x: x + width/2      });
// 				plusText .attr({ x: x + width - at/2 });
// 				clipPath .attr({
// 					x:     x + at,
// 					width: width - 2*at
// 				});
// 			});
//
// 			this.p(['y', 'height']).subscribe(([y, height]) => {
// 				allText .attr({ y: y + height - at/2 });
// 				clipPath.attr({ y: y + height - at   });
// 			});
//
// 			this.model.p('name').subscribe((n) => { labelText.attr({ text: n }) });
//
// 			return result;
//
// 		})();
//
// 		/* convenience function to use in partonomy setup */
// 		const takeUntilImNoLongerParent = (me => function takeUntilImNoLongerParent(a) {
// 			return this::takeUntil( a.p('parent')::filter(p => p !== me));
// 		})(this);
//
//
// 		group.g().addClass('parts');
// 		group.g().addClass('layers');
// 		group.g().addClass('segments'); // TODO: segments
//
//
// 		const borderGroup = (() => {
// 			const result = group.g().addClass('borders');
//
// 			this.leftBorder  = null;
// 			this.rightBorder = null;
//
// 			this.radialBorders.e('add').subscribe((borderLine) => {
// 				result.append(borderLine.element.svg);
// 				this.p('y')::subscribe_( borderLine.p('y1') , n=>n() );
// 				this.p(['y','height'], _add)::subscribe_( borderLine.p('y2') , n=>n() );
// 				if (!this.leftBorder) {
// 					this.leftBorder = borderLine;
// 					this.p('x')::subscribe_( borderLine.p('x1') , n=>n() );
// 					this.p('x')::subscribe_( borderLine.p('x2') , n=>n() );
// 				} else if (!this.rightBorder) {
// 					this.rightBorder = borderLine;
// 					this.p(['x', 'width'], _add)::subscribe_( borderLine.p('x1') , n=>n() );
// 					this.p(['x', 'width'], _add)::subscribe_( borderLine.p('x2') , n=>n() );
// 				}
// 			});
// 			this.radialBorders.e('delete').subscribe((borderLine) => {
// 				if      (borderLine === this.leftBorder)  { this.leftBorder  = null }
// 				else if (borderLine === this.rightBorder) { this.rightBorder = null }
// 				borderLine.element.remove();
// 			}); // TODO: proper deleting
//
// 			this.topBorder    = null;
// 			this.bottomBorder = null; // also axis
//
// 			this.longitudinalBorders.e('add').subscribe((borderLine) => {
// 				result.append(borderLine.element.svg);
// 				this.p('x')::subscribe_( borderLine.p('x1') , n=>n() );
// 				this.p(['x','width'], _add)::subscribe_( borderLine.p('x2') , n=>n() );
// 				if (!this.topBorder) {
// 					this.topBorder = borderLine;
// 					this.p('y')::subscribe_( borderLine.p('y1') , n=>n() );
// 					this.p('y')::subscribe_( borderLine.p('y2') , n=>n() );
// 				} else if (!this.bottomBorder) {
// 					this.bottomBorder = borderLine;
// 					this.p(['y', 'height'], _add)::subscribe_( borderLine.p('y1') , n=>n() );
// 					this.p(['y', 'height'], _add)::subscribe_( borderLine.p('y2') , n=>n() );
// 				}
// 			});
// 			this.longitudinalBorders.e('delete').subscribe((borderLine) => {
// 				if      (borderLine === this.topBorder)    { this.topBorder    = null }
// 				else if (borderLine === this.bottomBorder) { this.bottomBorder = null }
// 				borderLine.element.remove();
// 			}); // TODO: proper deleting
//
// 		})();
//
// 		group.g().addClass('nodes');
//
// 		/* return representation(s) of element */
// 		return { element: group.node };
// 	}
//
// 	[$$recycle](model) {
// 		if (!this[$$toBeRecycled].has(model)) { return false }
// 		let result = this[$$toBeRecycled].get(model);
// 		this[$$toBeRecycled].delete(model);
// 		return result;
// 	}
//
// 	async afterCreateElement() {
// 		await super.afterCreateElement();
//
//
// 		combineLatest(
// 			this.p('parent')::switchMap(p=>p?p.p('gTransform'):of(0)),
// 			this.p('rotation'),
// 			this.p('x'), this.p('y'),
// 			this.p('width'), this.p('height')
// 		)
// 			// ::sampleTime(1000/30)
// 			::map(()=>this.element.svg.transform().globalMatrix)
// 			::subscribe_( this.p('gTransform'), v=>v() );
//
// 		// /* convert between coordinate systems */
// 		// let scratchSVGPoint = this.root.element.createSVGPoint();
// 		// this.p(['x', 'y'], (x, y) => {
// 		// 	scratchSVGPoint.x = x;
// 		// 	scratchSVGPoint.y = y;
// 	     //    return scratchSVGPoint
// 		//         .matrixTransform(this.element.getCTM().inverse())
// 		//         ::pick('x', 'y');
// 		// }).subscribe(({x, y}) => {
// 		// 	this.gx = x;
// 		// 	this.gy = y;
// 		// });
// 		// this.p(['gx', 'gy'], (x, y) => {
// 		// 	scratchSVGPoint.x = x;
// 		// 	scratchSVGPoint.y = y;
// 	     //    return scratchSVGPoint
// 		//         .matrixTransform(this.element.getCTM())
// 		//         ::pick('x', 'y');
// 		// }).subscribe(({x, y}) => {
// 		// 	const E = 10e-6;
// 		// 	if (Math.abs(x-this.x) > E || Math.abs(y-this.y) > E) {
// 		// 		this.x = x;
// 		// 		this.y = y;
// 		// 	}
// 		// });
//
//
//
//
// 		/* new layer in the model --> new layer artifact */
// 		this[$$relativeLayerPosition] = new WeakMap();
// 		this.model['-->HasLayer'].e('add')
// 			::map(rel => ({ layer: rel[2], relativePosition: rel.p('relativePosition') }))
// 			::map(({layer, relativePosition}) => {
// 				let layerBox = this[$$recycle](layer) || new LyphRectangle({
// 					parent  : this,
// 					model   : layer,
// 					showAxis: false,
// 					free    : false
// 				});
// 				this[$$relativeLayerPosition].set(layerBox, relativePosition);
// 				return layerBox;
// 			})
// 			::subscribe_( this.layers.e('add') , n=>n() );
//
// 		/* new layer artifact --> house svg element */
// 		this.layers.e('add').subscribe((layer) => {
// 			this.inside.jq.children('.layers').append(layer.element);
// 			const removed = layer.p('parent')::filter(parent=>parent!==this);
//
// 			this.leftBorder.model.p('nature')
// 				::takeUntil(removed)
// 				::subscribe_( layer.leftBorder.model.p('nature'), v=>v() );
// 			this.rightBorder.model.p('nature')
// 				::takeUntil(removed)
// 				::subscribe_( layer.rightBorder.model.p('nature'), v=>v() );
//
// 			removed.subscribe(() => {
// 				if (layer.element.jq.parent()[0] === this.element) {
// 					layer.element.jq.remove();
// 				}
// 			});
// 		});
//
// 		/* new layer artifact --> move it together with its parent */
// 		this.layers.p('value')
// 			::map(layers => [...layers])
// 			::map(layers => ({
// 				dimensions:        this.pObj(['x', 'y', 'width', 'height']),
// 				layers:            layers,
// 				relativePositions: layers.map(::this[$$relativeLayerPosition].get)
// 			}))
// 			::switchMap(
// 				({dimensions, relativePositions}) =>
// 					combineLatest(dimensions, relativePositions),
// 				({layers}, [{width, height, x, y}, relativePositions]) => ({
// 					layers: layers::sortBy((l, i) => relativePositions[i]),
// 					wh_layer: {
// 						width:   width,
// 						height: (height - this.axisThickness) / layers.length
// 					},
// 					xy_parent: {x, y}
// 				}))
// 			.subscribe(({layers, wh_layer: {width, height}, xy_parent: {x, y}}) => {
// 				for (let i = 0; i < layers.length; ++i) {
// 					const layer = layers[i];
// 					layer::assign({
// 						width,
// 						height,
// 						x,
// 						y: y + i * height
// 					});
// 				}
// 			});
//
//
// 		this.freeFloatingStuff.e('add')::subscribe_( this.children.e('add') , n=>n() );
// 		this.children.e('delete')::subscribe_( this.freeFloatingStuff.e('delete') , n=>n() );
// 		this.syncModelWithArtefact(
// 			'HasPart',
// 			LyphRectangle,
// 			this.inside.jq.children('.parts'),
// 			({model, x, y, width, height}) => new LyphRectangle({
// 				model,
// 				x:      x      + 5,
// 				y:      y      + 5,
// 				width:  width  / 2,
// 				height: height / 2
// 			})
// 		);
//
// 		// this.freeFloatingStuff.e('add')::filter(a=>a instanceof NodeGlyph)::subscribe_( this.children.e('add') , n=>n() );
// 		// this.freeFloatingStuff.e('delete')::filter(a=>a instanceof NodeGlyph)::subscribe_( this.children.e('delete') , n=>n() );
// 		// this.children.e('delete')::filter(a=>a instanceof NodeGlyph)::subscribe_( this.freeFloatingStuff.e('delete') , n=>n() );
// 		// this.children.e('add')::filter(a=>a instanceof NodeGlyph)::subscribe_( this.freeFloatingStuff.e('add') , n=>n() );
// 		this.syncModelWithArtefact(
// 			'ContainsNode',
// 			NodeGlyph,
// 			this.inside.jq.children('.nodes'),
// 			({model, x, y, width, height}) => new NodeGlyph({
// 				model,
// 				x: x + width  - 13,
// 				y: y + height - 13 - this.axisThickness
// 			})
// 		);
//
// 	}
//
//
// 	syncModelWithArtefact(relationship, cls, parentElement, createNewArtefact) {
// 		/* new free-floating thing in the model --> new artifact */
// 		this.model['-->'+relationship].e('add')
// 			::filter(c => c.class === relationship)
// 			::map(c=>c[2])
// 			::withLatestFrom(this.p('x'), this.p('y'), this.p('width'), this.p('height'))
// 			::map(([model, x, y, width, height]) =>
// 				this[$$recycle](model) ||
// 				createNewArtefact({ model, x, y, width, height }))
// 			.do((artefact) => { artefact.free = true })
// 			::subscribe_( this.freeFloatingStuff.e('add') , n=>n() );
// 		/* new part artifact --> house svg element + move it together with its parent */
// 		this.freeFloatingStuff.e('add')
// 		    .subscribe((artefact) => {
// 		    	/* put into the dom */
// 		    	// debugger;
// 				parentElement.append(artefact.element);
// 			    /* event when removed */
// 				const removed = artefact.p('parent')::filter(parent => parent !== this);
// 				/* mirror movement of the parent */
// 				this.pObj(['x', 'y'])
// 					::takeUntil(removed)
// 					::shiftedMovementFor(artefact.pObj(['x', 'y']))
// 					.subscribe( artefact::assign );
// 				/* remove from dom when removed */
// 				removed.subscribe(() => {
// 					if (artefact.element.jq.parent()[0] === this.element) {
// 						artefact.element.jq.remove();
// 					}
// 				});
// 			});
// 	}
//
// 	get draggable() { return true }
//
// 	drop(droppedEntity, originalDropzone) {
// 		if (originalDropzone === this) {
// 			// dropped directly into this lyph rectangle
// 			if ([LyphRectangle, NodeGlyph].includes(droppedEntity.constructor)) {
// 				this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
// 				this.freeFloatingStuff.add(droppedEntity, { force: true });
// 			} else {
// 				return false;
// 			}
// 		} else if (this.longitudinalBorders.has(originalDropzone)) {
// 			// dropped onto longitudinal border (to become layer)
// 			if ([LyphRectangle].includes(droppedEntity.constructor)) {
// 				let newPosition = [...this.model['-->HasLayer']]
// 					::ldMap('relativePosition')
// 					::max() + 1;
// 				this.model.layers.delete(droppedEntity.model);
// 				this[$$toBeRecycled].set(droppedEntity.model, droppedEntity);
// 				window.module.classes.HasLayer.new({
// 					[1]: this.model,
// 					[2]: droppedEntity.model,
// 					relativePosition: newPosition
// 				});
// 				// this.layers.add(droppedEntity, { force: true });
// 			} else {
// 				return false;
// 			}
// 			// TODO: dropped on border (also put code in border class)
// 		}
// 	}
//
// }
