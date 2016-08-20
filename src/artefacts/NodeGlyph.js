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

import {interval} from 'rxjs/observable/interval';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operator/map';
import {take} from 'rxjs/operator/take';
import {toPromise} from 'rxjs/operator/toPromise';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import {flag} from "../util/ValueTracker";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class NodeGlyph extends SvgEntity {
	
	@property({ isValid: _isNumber }) x;
	@property({ isValid: _isNumber }) y;
	
	toString() { return `[${this.constructor.name}]` }
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'x', 'y'
		]);
	}
	
	createElement() {
		
		const group = gElement();
		
		let glyph = group.circle().attr({
			strokeWidth: '1px',
			stroke     : '#aa0000',
			fill       : '#ff5555',
			r          : 9
		});
		
		this.p('x').subscribe((x) => { glyph.attr({ cx: x }) });
		this.p('y').subscribe((y) => { glyph.attr({ cy: y }) });
		
		
		
		const highlightedBorder = (() => {
			let result = gElement().g().attr({
				pointerEvents : 'none'
			});
			result.circle().attr({
				stroke:      'black',
				strokeWidth: '3px'
			});
			result.circle().attr({
				stroke:      'white',
				strokeWidth: '1px'
			});
			let circles = result.selectAll('circle').attr({
				fill:            'none',
				pointerEvents :  'none',
				r:                13,
				strokeDasharray: '7, 4', // 11
				strokeDashoffset: 0
			});
			interval(1000/60)
				::map(n => ({ strokeDashoffset: -(n / 3.5 % 11) }))
				.subscribe( ::circles.attr );
			
			this.p(['highlighted', 'dragging'], (highlighted, dragging) => ({
				visibility: highlighted && !dragging ? 'visible' : 'hidden'
			})).subscribe( ::result.attr );
			
			this.p('x').subscribe((x) => { circles.attr({ cx: x }) });
			this.p('y').subscribe((y) => { circles.attr({ cy: y }) });
			
			$('#foreground').append(result.node);
			
			return result.node;
		})();
		
		
		
		/* return representation(s) of element */
		return {
			element: group.node
		};
		
	}
	
	get draggable() { return true }
	
	drop(droppedEntity) {
		// TODO
	}
	
}
