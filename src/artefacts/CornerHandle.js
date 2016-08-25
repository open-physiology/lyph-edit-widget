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
import {$$elementCtrl} from "../symbols";

const $$backgroundColor = Symbol('$$backgroundColor');


export default class CornerHandle extends SvgEntity {
	
	@property({ isValid: _isNumber }) x;
	@property({ isValid: _isNumber }) y;
	
	constructor(options) {
		super(options);
		this.setFromObject(options, [
			'x', 'y',
		    'resizes'
		]);
	}
	
	createElement() {
		const group = this.root.gElement();
		
		group.g().addClass('highlight-border');
		let handle = group.g().addClass('handle');
		
		/* return representation(s) of element */
		return {
			element: group.node,
			handle: handle.node
		};
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		{
			let hitBoxGroup = this.root.gElement().addClass('hit-box');
			
			$(hitBoxGroup.node)
				.css({ opacity: 0 })
				.attr('controller', ''+this);
			window[$$elementCtrl].set(hitBoxGroup.node, this);
			
			this.p('parent.free')
				.subscribe((free) => {
					hitBoxGroup.attr({
						pointerEvents: (free ? 'inherit' : 'none')
					});
				});
			
			let circle = hitBoxGroup.circle();
			
			this.p(['x', 'y']).subscribe(([x, y]) => {
				circle.attr({
					cx: x,
					cy: y,
					r:  10
				});
			});
			
			(await this.parent.insideCreated).jq
			    .children('.corners')
			    .append(hitBoxGroup.node);
			
			// TODO: make this work without the go-around, just as a lyph-rectangle child
		}
		
	}
	
}
