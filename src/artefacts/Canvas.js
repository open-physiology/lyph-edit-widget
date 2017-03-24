import $          from '../libs/jquery.js';
import Snap from '../libs/snap.svg';

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

// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: pairwise;
// TODO: no longer need to import: combineLatest;
// TODO: make sure we don't need to import: withLatestFrom;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: delay;

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
import {setCTM, ID_MATRIX} from "../util/svg";

const $$context = Symbol('$$context');
const $$existingSVG = Symbol('$$existingSVG');
const $$backgroundColor        = Symbol('$$backgroundColor');
const $$existingArtefactsToUse = Symbol('$$existingArtefactsToUse');


export default class Canvas extends SvgEntity {
	
	freeFloatingEntities = new ObservableSet();
	draggedEntities      = new ObservableSet();
	
	constructor(options = {}) {
		super(options);
		
		this[$$context] = new ValueTracker()::assign({ root: this });
		
		this[$$existingSVG] = $(options.element);
		
		if (!this.model) { this.model = { name: '(canvas)' } }
		
	}
	
	get context() { return this[$$context] }
	
	gElement() {
		let result = this.element.svg.g();
		$(result.node).detach();
		return result;
	}
	
	createElement() {
		let viewport = Snap((this[$$existingSVG] || $(`<svg>`))[0]);
		let canvas = viewport.g();
		
		canvas.g().addClass('fixed free-floating-entities');
		canvas.g().addClass('fixed processes');
		canvas.g().addClass('fixed foreground');
		
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
		this.inside.jq.children('.free-floating-entities').append(droppedEntity.element);
	}
	
}
