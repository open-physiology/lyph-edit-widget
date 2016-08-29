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
import CoalescenceScenarioRectangle from "./CoalescenceScenarioRectangle";
import NodeGlyph from "./NodeGlyph";
import MeasurableGlyph from "./MeasurableGlyph";
import MaterialGlyph from "./MaterialGlyph";
import CausalityArrow from "./CausalityArrow";

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
	
	gElement() {
		let result = this.element.svg.g();
		$(result.node).detach();
		return result;
	}
	
	createElement() {
		window.E  = ""; // <-- ugly hack to fix snap.svg.zpd bug
		let viewport = Snap((this[$$existingSVG] || $(`<svg>`))[0]);
		viewport.zpd({
			pan:  false,
			zoom: false,
			drag: false
		});
		let canvas = viewport.select('g[id^="snapsvg-zpd-"]');
		
		canvas.g().addClass('free-floating-entities');
		canvas.g().addClass('processes');
		canvas.g().addClass('foreground');
		
		/* return representation(s) of element */
		return {
			element: viewport.node,
			inside:  canvas  .node
		};
	}
	
	async afterCreateElement() {
		await super.afterCreateElement();
		
		this.children.e('add').subscribe((droppedEntity) => {
			if ([LyphRectangle, NodeGlyph, MeasurableGlyph, MaterialGlyph, CoalescenceScenarioRectangle].includes(droppedEntity.constructor)) {
				this.inside.jq.children('.free-floating-entities').append(droppedEntity.element);
			} else if ([ProcessLine, CausalityArrow].includes(droppedEntity.constructor)) {
				this.inside.jq.children('.processes').append(droppedEntity.element);
			}
			
		});
	}
	
	drop(droppedEntity, originalDropzone = this) {
		droppedEntity::assign({
			parent:    this,
			free:      true,
			draggable: true,
			resizable: true
		});
		this.inside.jq.children('.lyphs').append(droppedEntity.element);
	}
	
}
