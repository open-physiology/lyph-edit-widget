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
import {takeUntil} from 'rxjs/operator/takeUntil';
import {delay} from 'rxjs/operator/delay';

import chroma from '../libs/chroma.js';

import SvgEntity from './SvgEntity.js';

import {property} from '../util/ValueTracker.js';
import ObservableSet, {copySetContent} from "../util/ObservableSet";
import BorderLine from './BorderLine';

import LyphRectangle from "./LyphRectangle";
import ProcessLine from "./ProcessLine";
import ValueTracker from "../util/ValueTracker";

const $$context = Symbol('$$context');
const $$existingSVG = Symbol('$$existingSVG');
const $$backgroundColor        = Symbol('$$backgroundColor');
const $$existingArtefactsToUse = Symbol('$$existingArtefactsToUse');


export default class Canvas extends SvgEntity {
	
	constructor(options = {}) {
		super(options);
		
		this[$$context] = new ValueTracker()::assign({ root: this });
		
		this[$$existingSVG] = $(options.element);
		
		this.setFromObject(options, ['model'], {
			dragging: false
		});
		
		if (!this.model) { this.model = { name: '(canvas)' } }
		
	}
	
	get context() { return this[$$context] }
	
	get paper() { return this_paper }
	
	gElement() {
		return this._paper.g();
	}
	
	createElement() {
		window.E  = ""; // <-- ugly hack to fix snap.svg.zpd bug
		let root  = this[$$existingSVG] || $(`<svg></svg>`);
		let paper = Snap(root[0]);
		this._paper = paper;
		paper.zpd({
			pan:  false,
			zoom: false,
			drag: false
		});
		let canvas = root.children('g');
		canvas.append($.svg(`<g class="lyphs"></g>`))
		      .append($.svg(`<g class="processes"></g>`))
		      .append($.svg(`<g id="foreground"></g>`));
		
		
		/* return representation(s) of element */
		return {
			element: paper.node,
			inside:  canvas[0]
		};
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		this.children.e('add').subscribe((artefact) => {
			if (artefact instanceof LyphRectangle) {
				this.inside.jq.children('.lyphs').append(artefact.element);
			} else if (artefact instanceof ProcessLine) {
				this.inside.jq.children('.processes').append(artefact.element);
			}
		});
		
	}
	
	drop(droppedEntity, originalDropzone = this) {
		droppedEntity.parent = this;
		droppedEntity.free = true;
		this.inside.jq.children('.lyphs').append(droppedEntity.element);
	}
	
}
