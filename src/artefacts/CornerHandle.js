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


export default class CornerHandle extends SvgEntity {
	
	@property({ isValid: _isNumber }) x;
	@property({ isValid: _isNumber }) y;
	
	@flag(true) movable;
	
	toString() { return `[${this.constructor.name}]` }
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'x', 'y', 'movable',
		    'resizes'
		]);
	}
	
	createElement() {
		const group = this.root.gElement();
		
		const highlightedBorder = (() => {
			let result = this.root.gElement().g().attr({
				pointerEvents : 'none'
			});
			let thickCircle = result.circle().attr({
				stroke:      'black',
				strokeWidth: '3px'
			});
			let thinCircle = result.circle().attr({
				stroke:      'white',
				strokeWidth: '1px'
			});
			let circles = result.selectAll('circle').attr({
				fill:            'none',
				pointerEvents :  'none',
				r:                8,
				strokeDasharray: '5, 3', // 8
				strokeDashoffset: 0
			});
			
			interval(1000/60)
				::map(n => ({ strokeDashoffset: -(n / 3.5 % 8) }))
				.subscribe( ::circles.attr );
			
			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
				visibility: highlighted && !dragging ? 'visible' : 'hidden'
			})).subscribe( ::result.attr );
			
			this.p('x').subscribe((x) => { circles.attr({ cx: x }) });
			this.p('y').subscribe((y) => { circles.attr({ cy: y }) });
		
			let parentLyph = this.findAncestor(a => a.free);
			parentLyph.inside.jq.children('.foreground').append(result.node);
			
			return result.node;
		})();
		
		/* return representation(s) of element */
		return { element: group.node };
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		
		let result = this.root.gElement().rect();
		
		$(result.node)
			.css({ opacity: 0 })
			.attr('controller', ''+this)
			.data('controller', this);
		
		this.p('movable')
			::map(m => ({ pointerEvents: m ? 'inherit' : 'none' }))
			.subscribe( ::result.attr );
		
		this.p(['x', 'y']).subscribe(([x, y]) => {
			result.attr({
				x: x-3,
				y: y-3,
				width: 7,
				height: 7
			});
		});
		
		let parentLyph = this.findAncestor(a => a.free);
		parentLyph.inside.jq.children('.foreground').append(result.node);
		
	}
	
	get draggable() { return false }
	
}
