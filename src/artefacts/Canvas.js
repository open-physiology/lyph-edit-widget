import $    from '../libs/jquery.js';
import Snap from '../libs/snap.svg';

import {assign} from 'lodash-bound';

import SvgEntity from './SvgEntity.js';

import ObservableSet, {copySetContent} from "../util/ObservableSet";

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
