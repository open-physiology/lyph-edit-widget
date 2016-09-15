import ValueTracker, {event} from '../util/ValueTracker';
import $ from 'jquery';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {startWith} from 'rxjs/operator/startWith';
import {merge} from 'rxjs/observable/merge';
import {never} from 'rxjs/observable/never';
import {scan} from 'rxjs/operator/scan';
import {map} from 'rxjs/operator/map';
import {pairwise} from 'rxjs/operator/pairwise';
import {distinctUntilChanged} from 'rxjs/operator/distinctUntilChanged'
import {Subject} from 'rxjs/Subject';
import {interval} from 'rxjs/observable/interval';

//noinspection JSFileReferences
import {ALT} from 'keycode.js';


import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import head from 'lodash-bound/head';
import tail from 'lodash-bound/tail';
import clamp from 'lodash-bound/clamp';
import defaults from 'lodash-bound/defaults';
import sum from 'lodash-bound/sum';
import isArray from 'lodash-bound/isArray';
import isString from 'lodash-bound/isString';

import _head from 'lodash/head';
import _add from 'lodash/add';
import _parseInt from 'lodash/parseInt';

import Tool from './Tool';
import {withMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {withoutMod} from "../util/misc";
import {which} from "../util/misc";
import {log} from '../util/rxjs';

import {ID_MATRIX} from "../util/svg";

import indent from 'indent-string';
import LyphRectangle from "../artefacts/LyphRectangle";
import {withLatestFrom} from "rxjs/operator/withLatestFrom";
import {takeUntil} from "rxjs/operator/takeUntil";
import CoalescenceScenarioRectangle from "../artefacts/CoalescenceScenarioRectangle";
import CornerHandle from "../artefacts/CornerHandle";
import NodeGlyph from "../artefacts/NodeGlyph";
import BorderLine from "../artefacts/BorderLine";
import MeasurableGlyph from "../artefacts/MeasurableGlyph";
import {setCTM} from "../util/svg";
import {of} from "rxjs/observable/of";
import {from} from "rxjs/observable/from";
import {Observable} from "rxjs/Observable";
import {exhaustMap} from "rxjs/operator/exhaustMap";
import MaterialGlyph from "../artefacts/MaterialGlyph";
import {tap} from "../util/rxjs";
import ProcessLine from "../artefacts/ProcessLine";
import {rotateFromVector} from "../util/svg";


const $$selectTools = Symbol('$$selectTools');
const $$child   = Symbol('$$child');
const $$onStack = Symbol('$$onStack');
const $$isRectangular = Symbol('$$isRectangular');
const $$isPoint = Symbol('$$isPoint');
const $$isLine  = Symbol('$$isLine');

export default class SelectTool extends Tool {
	
	constructor(context) {
		super(context, { events: ['mouseenter', 'mouseleave'] });
		
		let {root} = context;
		
		/* equip context object */
		if (!context[$$selectTools]) {
			context[$$selectTools] = true;
			
			/* 'selected' property */
			context.newProperty('selected', { initial: root });
			
			/* registering mouse cursors for specific types of artifact */
			context.cursorSet = new Set();
			context.registerCursor = ::context.cursorSet.add;
			context.p('selected')::switchMap((artifact) => {
				for (let candidate of context.cursorSet) {
					let cursor = candidate(artifact);
					if (cursor) {
						if (cursor::isString()) { return of(cursor) }
						else                    { return cursor     }
					}
				}
				return of('auto');
			}).subscribe((cursor) => {
				root.inside.jq.attr(
					'style',
					`auto ${cursor}`.split(' ').map(c=>`cursor: ${c};`).join(' ')
				);
			});
		}
		
		/* basic event-streams */
		const mouseenter = this.e('mouseenter');
		const mousewheel = this.rootE('mousewheel');
		const mouseleave = this.e('mouseleave');
		
		/* build selected artefact stream */
		merge(mouseenter, mouseleave)
			::scan((top, {controller, type}) => {
				switch (type) {
					case 'mouseenter': onMouseenter(controller); break;
					case 'mouseleave': onMouseleave(controller); break;
				}
				while (top !== root && !top[$$onStack]) { top = top.parent   }
				while (top[$$child])                    { top = top[$$child] }
				return top;
				function onMouseenter(ctrlr) {
					ctrlr[$$onStack] = true;
					if (ctrlr.parent) {
						ctrlr.parent[$$child] = ctrlr;
					}
					if (!top) { top = ctrlr }
				}
				function onMouseleave(ctrlr) {
					if (ctrlr === root) { return }
					delete ctrlr[$$onStack];
					if (ctrlr.parent && ctrlr.parent[$$child] === ctrlr) {
						delete ctrlr.parent[$$child];
					}
				}
			}, root)
			::distinctUntilChanged()
			// ::log('(selected)')
			::switchMap((top) => mousewheel
				::filter(withMod('alt'))
				::tap(stopPropagation)
				::map(e=>e.deltaY)
				::scan((s, d) => {
					let next = s[d>0 ? 'parent' : $$child];
					if (!next || next === root) { return s }
					return next;
				}, top)
				::startWith(top))
			.subscribe( context.p('selected') );
		
		/* set the selected property on  */
		context.p('selected')::pairwise().subscribe(([prev, curr]) => {
			if (prev) { prev.selected = false }
			if (curr) { curr.selected = true  }
		});
		
		
		/* create visible select boxes */
		this.createRectangularSelectBox();
		this.createCircleSelectBox();
		// this.createLineSelectBox();
		// TODO: fix and reintroduce createLineSelectBox
		
		// TODO: change cursor to be appropriate for
		//     : manipulation on selected artefact
		
	}
	
	
	createRectangularSelectBox() {
		const context = this.context;
		
		if (context.rectangularSelectBox) { return }
		
		let canvas = context.root.inside.svg;
		
		let rectangularSelectBox = context.rectangularSelectBox = canvas.g().addClass('rectangular-select-box').attr({
			pointerEvents: 'none',
			transform: ''
		});
		
		rectangularSelectBox.rect().attr({
			stroke:      'black',
			strokeWidth: '3px'
		});
		rectangularSelectBox.rect().attr({
			stroke:      'white',
			strokeWidth: '1px'
		});
		let rects = rectangularSelectBox.selectAll('rect').attr({
			fill:            'none',
			shapeRendering:  'geometricPrecision',
			pointerEvents :  'none',
			strokeDashoffset: 0,
			x: -4,
			y: -4,
			width: 0,
			height: 0
		});
		
		/* which artefacts are rectangular? */
		LyphRectangle.prototype[$$isRectangular] = {
			box: rectangularSelectBox,
			strokeDasharray: [8, 5]
		};
		CoalescenceScenarioRectangle.prototype[$$isRectangular] = {
			box: rectangularSelectBox,
			strokeDasharray: [14, 7]
		};
		
		/* visibility observable */
		let rectangularBoxVisible = context.p(['selected', 'selected.dragging'], (selected, dragging) =>
			selected  &&
			!dragging &&
			selected[$$isRectangular]
		);
		
		/* make (in)visible */
		rectangularBoxVisible.subscribe((v) => {
			rectangularSelectBox.attr({
				visibility:      v ? 'visible' : 'hidden',
				strokeDasharray: v && v.strokeDasharray.join(',')
			});
		});
		
		/* animate selection border */
		rectangularBoxVisible::switchMap(v => !v
			? never()
			: interval(1000/60)::map(n => ({ strokeDashoffset: -(n / 3 % v.strokeDasharray::sum()) }))
		).subscribe( ::rects.attr );
		
		/* sizing */
		context.p(
			['selected.width', 'selected.height'],
			(w, h) => ({ width: w+8, height: h+8 })
		).subscribe( ::rects.attr );
		
		/* positioning */
		context.p('selected')
			::filter(selected => selected && selected[$$isRectangular])
			::map(s => s.element.getTransformToElement(context.root.inside).translate(s.x || 0, s.y || 0))
            .subscribe( rectangularSelectBox.node::setCTM );
	}
	
	
	createCircleSelectBox() {
		const context = this.context;
		
		if (context.pointSelectBox) { return }
		
		let canvas = context.root.inside.svg;
		
		let pointBox = context.pointSelectBox = canvas.g().addClass('point-select-box').attr({
			pointerEvents: 'none',
			transform:     ''
		});
		
		pointBox.circle().attr({
			stroke:      'black',
			strokeWidth: '3px'
		});
		pointBox.circle().attr({
			stroke:      'white',
			strokeWidth: '1px'
		});
		let circles = pointBox.selectAll('circle').attr({
			fill:            'none',
			pointerEvents :  'none',
			strokeDashoffset: 0,
			cx:               0,
			cy:               0
		});
		
		/* which artefacts are points? */
		CornerHandle.prototype[$$isPoint] = {
			r:                8,
			strokeDasharray: [5, 3]
		};
		NodeGlyph.prototype[$$isPoint] = {
			r:                11,
			strokeDasharray: [5, 3]
		};
		MeasurableGlyph.prototype[$$isPoint] = {
			r:                15,
			strokeDasharray: [8, 4]
		};
		MaterialGlyph.prototype[$$isPoint] = {
			r:                23,
			strokeDasharray: [10, 5]
		};
		
		/* visibility observable */
		let pointBoxVisible = context.p(['selected', 'selected.dragging'])
			::map(([selected, dragging]) =>
				selected  &&
				!dragging &&
				selected[$$isPoint]
			);
		
		/* make (in)visible */
		pointBoxVisible::map(v => ({
			visibility:      v ? 'visible' : 'hidden',
			...(!v ? {} : {
				strokeDasharray: v.strokeDasharray.join(','),
				r:               v.r
			})
		})).subscribe( ::circles.attr );
		
		/* animate selection border */
		pointBoxVisible::switchMap(v => !v
			? never()
			: interval(1000/60)::map(n => ({
				strokeDashoffset: -(n / 3 % v.strokeDasharray::sum())
			}))
		).subscribe( ::circles.attr );
		
		/* positioning */
		context.p('selected')
			::filter(selected => selected && selected[$$isPoint])
			::map(s => s.element.getTransformToElement(context.root.inside).translate(s.x || 0, s.y || 0))
            .subscribe( pointBox.node::setCTM );
	}
	
	
	createLineSelectBox() {
		const context = this.context;
		
		if (context.lineSelectBox) { return }
		
		let canvas = context.root.inside.svg;
		
		let lineSelectBox = context.lineSelectBox = canvas.g().addClass('line-select-box').attr({
			pointerEvents: 'none'
		});
		
		lineSelectBox.rect().attr({
			stroke:      'black',
			strokeWidth: '3px'
		});
		lineSelectBox.rect().attr({
			stroke:      'white',
			strokeWidth: '1px'
		});
		let rects = lineSelectBox.selectAll('rect').attr({
			fill:            'none',
			shapeRendering:  'geometricPrecision',
			pointerEvents :  'none',
			strokeDashoffset: 0
		});
		
		/* which artefacts are rectangular? */
		ProcessLine.prototype[$$isLine] = {
			box: lineSelectBox,
			strokeDasharray: [6, 2]
		};
		BorderLine.prototype[$$isLine] = {
			box: lineSelectBox,
			strokeDasharray: [3, 2]
		};
		
		/* visibility observable */
		let boxIsVisible = context.p(['selected', 'selected.dragging'])
			::map(([selected, dragging]) =>
				selected  &&
				!dragging &&
				selected[$$isLine]
			);
		
		/* make (in)visible */
		boxIsVisible.subscribe((v) => {
			lineSelectBox.attr({
				visibility: v ? 'visible' : 'hidden',
				strokeDasharray: v && v.strokeDasharray.join(',')
			});
		});
		
		/* animate selection border */
		boxIsVisible::switchMap(v => !v
			? never()
			: interval(1000/60)::map(n => ({ strokeDashoffset: -(n / 3 % v.strokeDasharray::sum()) }))
		).subscribe( ::rects.attr );
		
		/* sizing */
		boxIsVisible::switchMap(v => !v
			? never()
			: context.p(['selected.x1', 'selected.y1', 'selected.x2', 'selected.y2'])
                ::map(([x1, y1, x2, y2]) => ({
                	w: Math.sqrt(Math.pow(Math.abs(x1-x2),2) + Math.pow(Math.abs(y1-y2),2)) + 8,
					h: 8,
					t: ID_MATRIX
						.translate        ( (x1+x2)/2,          (y1+y2)/2          )
						::rotateFromVector(  x2-x1,              y2-y1             )
						.translate        ( -Math.abs(x1-x2)/2, -Math.abs(y1-y2)/2 )
                }))
		).subscribe(({w, h, t}) => {
			rects.attr({ width: w, height: h });
			lineSelectBox.node::setCTM(t);
		});
	}
	
	
}
