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
