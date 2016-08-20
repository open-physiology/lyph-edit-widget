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
import {interval} from 'rxjs/observable/interval';

import {map} from 'rxjs/operator/map';
import {take} from 'rxjs/operator/take';
import {filter} from 'rxjs/operator/filter';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import {flag} from "../util/ValueTracker";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class BorderLine extends SvgEntity {
	
	@property({ isValid: _isNumber }) x1;
	@property({ isValid: _isNumber }) y1;
	@property({ isValid: _isNumber }) x2;
	@property({ isValid: _isNumber }) y2;
	
	@flag(true) movable;
	
	toString() { return `[${this.constructor.name}]` }
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'x1', 'y1', 'x2', 'y2', 'free', 'movable'
		]);
	}
	
	createElement() {
		const group = this.root.gElement();
		
		{
			let result = group.line().attr({
				strokeWidth   : '2px',
				stroke        : 'black',
				shapeRendering: 'crispEdges',
				pointerEvents : 'none',
				strokeLinecap : 'square'
			});
			
			this.p('x1').subscribe(x1 => result.attr({ x1 }));
			this.p('x2').subscribe(x2 => result.attr({ x2 }));
			this.p('y1').subscribe(y1 => result.attr({ y1 }));
			this.p('y2').subscribe(y2 => result.attr({ y2 }));
			
			this.model.p('nature')
				::map(n => ({ strokeDasharray: n === 'open' ? '5, 5' : 'none' }))
				.subscribe( ::result.attr );
		}
		
		
		
		const highlightedBorder = (() => {
			let result = this.root.gElement().g().attr({
				pointerEvents : 'none'
			});

			this.p('gTransform')::filter(v=>v)::map(m=>m.toTransformString())
			    .subscribe( ::result.transform );

			result.rect().attr({
				stroke:      'black',
				strokeWidth: '3px'
			});
			result.rect().attr({
				stroke:      'white',
				strokeWidth: '1px'
			});
			let rects = result.selectAll('rect').attr({
				fill:            'none',
				shapeRendering:  'crispEdges',
				pointerEvents :  'none',
				strokeDasharray: '8, 5', // 13
				strokeDashoffset: 0
			});
			interval(1000/60)
				::map(n => ({ strokeDashoffset: -(n / 3 % 13) }))
				.subscribe( ::rects.attr );


			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
				visibility: highlighted && !dragging ? 'visible' : 'hidden'
			})).subscribe( ::result.attr );

			this.p(['x1', 'x2', 'y1', 'y2'], (x1, x2, y1, y2) => ({
				x:      Math.min(x1, x2) - 4,
				y:      Math.min(y1, y2) - 4,
				width:  Math.abs(x1-x2) + 8,
				height: Math.abs(y1-y2) + 8
			})).subscribe( ::rects.attr );
			
			// this.p('x1')     .subscribe((x)      => { rects.attr({ x:      x-4      }) });
			// this.p('y')     .subscribe((y)      => { rects.attr({ y:      y-4      }) });
			// this.p('width') .subscribe((width)  => { rects.attr({ width:  width+7  }) });
			// this.p('height').subscribe((height) => { rects.attr({ height: height+7 }) });

			$('#foreground').append(result.node);

			return result.node;
		})();
		
		
		
		
		/* return representation(s) of element */
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		let parentLyph = this.findAncestor(a => a.free);
		
		let result = this.root.gElement().rect();
		
		$(result.node)
			.css({ opacity: 0 })
			.attr('controller', ''+this)
			.data('controller', this);
		
		this.p('movable')
			::map(m => ({ pointerEvents: m ? 'inherit' : 'none' }))
			.subscribe( ::result.attr );
		
		this.p(['x1', 'x2', 'y1', 'y2']).subscribe(([x1, x2, y1, y2]) => {
			if (x1 === x2) {
				$(result.node).css({ cursor: 'col-resize' });
				result.attr({
					x: x1-2,
					y: y1,
					width: 5,
					height: Math.abs(y1 - y2)
				});
			} else {
				$(result.node).css({ cursor: 'row-resize' });
				result.attr({
					x: x1,
					y: y1-2,
					width: Math.abs(x1 - x2),
					height: 5
				});
			}
		});
		
		parentLyph.inside.jq.children('.foreground').append(result.node);
		
	}
	
	get draggable() { return false }
	
	drop(droppedEntity, originalDropzone = this) {
		this.parent.drop(droppedEntity, originalDropzone);
	}
	
	
}
