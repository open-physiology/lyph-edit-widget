import $ from 'jquery';

import {property} from '../util/ValueTracker';
import {fromEvent} from 'rxjs/observable/fromEvent';
import {of} from 'rxjs/observable/of';
import {switchMap} from 'rxjs/operator/switchMap';
import {filter} from 'rxjs/operator/filter';
import {takeUntil} from 'rxjs/operator/takeUntil';
import {withLatestFrom} from 'rxjs/operator/withLatestFrom';
import {take} from 'rxjs/operator/take';
import {map} from 'rxjs/operator/map';
import {concat} from 'rxjs/operator/concat';

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import isFunction from 'lodash-bound/isFunction';
import defaults from 'lodash-bound/defaults';
import find from 'lodash-bound/find';

import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {ID_MATRIX} from "../util/svg";
import {log} from "../util/rxjs";
import {combineLatest} from "rxjs/observable/combineLatest";
import {merge} from "rxjs/observable/merge";
import {tap} from "../util/rxjs";
import Tool from './Tool';
import LyphRectangle from "../artefacts/LyphRectangle";
import Canvas from "../artefacts/Canvas";
import NodeGlyph from "../artefacts/NodeGlyph";
import BorderLine from "../artefacts/BorderLine";
import ProcessLine from "../artefacts/ProcessLine";
import CoalescenceScenarioRectangle from "../artefacts/CoalescenceScenarioRectangle";
import {tX} from "../util/svg";
import {tY} from "../util/svg";
import {enrichDOM} from "../util/misc";
import {setCTM} from "../util/svg";
import {rotateFromVector} from "../util/svg";
import {closestCommonAncestor} from "../artefacts/SvgEntity";
import {Vector2D} from "../util/svg";
import {which} from "../util/misc";

//noinspection JSFileReferences
import keyCodes from 'keycode.js';
import MeasurableGlyph from "../artefacts/MeasurableGlyph";
import {skip} from "rxjs/operator/skip";
import {Observable} from "rxjs/Observable";
const {ESCAPE} = keyCodes;


const C = window.module.classes;


export default class DrawingTool extends Tool {
	
	@property({ initial: null }) model;
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const mousemove = this.documentE('mousemove');
		const mouseup   = this.documentE('mouseup');
		const keydown   = this.documentE('keydown');
		
		this.p('model')::map(c=>!!c).subscribe( this.p('active') );
		this.p('active')::filter(a=>!a)::map(c=>null).subscribe( this.p('model') );
		
		this.p('active')::map(a=>!a).subscribe( context.PanTool         .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.DragDropTool    .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.ResizeTool      .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.BorderToggleTool.p('active') );
		// TODO: remove the 'active' property from tools, now that we have state machines
		
		/* tooltip management */
		$('body').powerTip({
			followMouse: true,
			fadeInTime:   0,
			fadeOutTime:  0,
			offset:      20,
			manual:      true
		});
		function updateTooltip(title, extra) {
			let content = `
				<b>${title}</b>
			`;
			if (extra && extra.length > 0) {
				content += `
					<ul style="margin: 3px 0 0 0; padding: 0 0 0 17px; font-style: italic;">
						${extra.map(e => `<li>${e}</li>`).join('')}
					</ul>
				`;
			}
			$('body').data('powertip', content);
			$('#powerTip').html(content);
			$.powerTip.show($('body')[0]);
			$(document).off('click.powertip'); // disable annoying feature
		}
		function hideTooltip() { $.powerTip.hide() }
		
		/* preparing to draw a given model */
		const branches = new Set();
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'IDLE': () => {
				hideTooltip();
				this.model = null;
				this.p('model')
					::filter(m => !!m)
					::map(model => ({ model }))
					::enterState('READY_TO_DRAW_MODEL');
			},
			'READY_TO_DRAW_MODEL'  : ({ model }) => {
				if (C.OmegaTree.hasInstance(model) || C.Process.hasInstance(model)) { // TODO: configure this flexibly; this is a hack to get it working quickly for omega trees
					updateTooltip(`${model.constructor.singular} (initial node)`, [
						`click and hold the left mouse button to create a new node`,
						`click on an existing node to start the ${model.constructor.singular} there`,
						`<kb style="border: solid 1px white; border-radius: 2px; padding: 0 1px; font-family: monospace">esc</kb> = close the current tool`
					]);
				} else if (C.Lyph.hasInstance(model) || C.CoalescenceScenario.hasInstance(model)) {
					updateTooltip(model.constructor.singular, [
						`click and hold the left mouse-button and drag down/right`,
						`<kb style="border: solid 1px white; border-radius: 2px; padding: 0 1px; font-family: monospace">esc</kb> = close the current tool`
					]);
				} else {
					updateTooltip(model.constructor.singular, [
						`click and hold the left mouse button`,
						`<kb style="border: solid 1px white; border-radius: 2px; padding: 0 1px; font-family: monospace">esc</kb> = close the current tool`
					]);
				}
				this.e('mousedown')
					::filter(withoutMod('ctrl', 'shift', 'meta'))
					::tap(stopPropagation)
					::withLatestFrom(context.p('selected'))
					::map(([downEvent, parentArtefact]) => ({
						downEvent     : downEvent,
						parentArtefact: parentArtefact,
						model         : model
					})) ::enterState('STARTED_DRAWING_MODEL');
				this.p('model')
					::filter(m => m && m !== model)
					::map(model => ({ model }))
					::enterState('READY_TO_DRAW_MODEL');
				this.p('model')
					::filter(m => !m)
					::enterState('IDLE');
				keydown
					::which(ESCAPE)
					::enterState('IDLE');
			},
			'STARTED_DRAWING_MODEL': ({ downEvent, parentArtefact, model }) => {
				const modelIs  = (classes) => classes.some(cls => cls.hasInstance(model));
				const parentIs = (classes) => classes.some(cls => parentArtefact instanceof cls);
				const branch = [...branches]::find(([mCls, pCls]) => modelIs(mCls) && parentIs(pCls));
				if (!branch) {
					enterState('IDLE');
				} else {
					const [,,nextState] = branch;
					enterState(nextState, { downEvent, parentArtefact, model });
				}
			}
		}));
		
		/* drawing a lyph rectangle */
		branches.add([[C.Lyph], [Canvas, LyphRectangle], 'DRAWING_LYPH_RECTANGLE']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_LYPH_RECTANGLE': ({downEvent, parentArtefact, model}) => {
				updateTooltip(model.constructor.singular, [
					`release the mouse-button when finished`
				]);
				const p = downEvent.point.in(parentArtefact.inside);
				const newArtefact = new LyphRectangle({
					model   : model,
					parent  : parentArtefact, // TODO: specific types of parentage (layer, part, segment, ...) so that the 'drop' code below is not needed
					...p.obj()
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newArtefact);
				}
				enterState('RESIZING_RECTANGLE', {
					downEvent:         downEvent,
					resizingArtefact:  newArtefact,
					directions:      { right: true, bottom: true },
					mouseDownIsOrigin: true
				});
			}
		}));
		
		/* drawing a coalescence scenario rectangle */
		branches.add([[C.CoalescenceScenario], [Canvas, LyphRectangle], 'DRAWING_COALESCENCE_RECTANGLE']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_COALESCENCE_RECTANGLE': ({downEvent, parentArtefact, model}) => {
				updateTooltip(model.constructor.singular, [
					`release the mouse-button when finished`
				]);
				const p = downEvent.point.in(parentArtefact.inside);
				const newArtefact = new CoalescenceScenarioRectangle({
					model : model,
					parent: parentArtefact,
					...p.obj()
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newArtefact);
				}
				enterState('RESIZING_RECTANGLE', {
					downEvent:         downEvent,
					resizingArtefact:  newArtefact,
					directions:      { right: true, bottom: true },
					mouseDownIsOrigin: true
				});
			}
		}));
		
		/* drawing a node glyph */
		branches.add([[C.Node], [Canvas, LyphRectangle, BorderLine], 'DRAWING_NODE_GLYPH']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_NODE_GLYPH': ({downEvent, parentArtefact, model}) => {
				updateTooltip(model.constructor.singular, [
					`release the mouse-button when finished`
				]);
				const p = downEvent.point.in(parentArtefact.inside);
				let newArtefact = new NodeGlyph({
					model : model,
					parent: parentArtefact,
					...p.obj()
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newArtefact);
				}
				enterState('MOVING', {
					mousedownVector: downEvent.point,
					movingArtefact:  newArtefact
				});
			}
		}));
		
		/* drawing a measurable glyph */
		branches.add([[C.Measurable], [Canvas, LyphRectangle, BorderLine, ProcessLine], 'DRAWING_MEASURABLE_GLYPH']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_MEASURABLE_GLYPH': ({downEvent, parentArtefact, model}) => {
				updateTooltip(model.constructor.singular, [
					`release the mouse-button when finished`
				]);
				const p = downEvent.point.in(parentArtefact.inside);
				let newArtefact = new MeasurableGlyph({
					model : model,
					parent: parentArtefact,
					...p.obj()
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newArtefact);
				}
				enterState('MOVING', {
					mousedownVector: downEvent.point,
					movingArtefact:  newArtefact
				});
			}
		}));
		
		/* drawing an omega tree */
		branches.add([[C.OmegaTree], [Canvas, LyphRectangle, BorderLine, NodeGlyph], 'DRAWING_OMEGA_TREE']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_OMEGA_TREE': ({downEvent, parentArtefact, model}) => {
				const parts = [...model.parts];
				let newNode = C.Node.new();
				enterState('DRAWING_FIRST_PROCESS_LINE_NODE', {
					downEvent,
					parentArtefact,
					model: C.Process.new({ source: newNode, target: newNode }),
					tooltipText: `${model.constructor.singular} (initial node)`
				}, { 'READY_TO_DRAW_PROCESS_LINE_NODE': data => ['READY_TO_DRAW_SUB_OMEGA_TREE', {
					...data,
					model,
					conveyingLyph: parts.filter(p=>!p.treeParent)[0],
					total:         parts.length,
					counter:       0
				}]});
			},
			'READY_TO_DRAW_SUB_OMEGA_TREE': ({sourceNodeArtefact, model, /***/ conveyingLyph, counter, total}) => {
				if (!conveyingLyph) {
					enterState('IDLE');
					return;
				}
				enterState('READY_TO_DRAW_PROCESS_LINE_NODE', {
					sourceNodeArtefact,
					tooltipText: `${model.constructor.singular} (${counter+1}/${total})`
				}, { 'DRAWING_PROCESS_LINE_NODE': data => ['DRAWING_SUB_OMEGA_TREE', {
					...data,
					model,
					conveyingLyph,
					counter,
					total
				}]});
			},
			'DRAWING_SUB_OMEGA_TREE': ({downEvent, parentArtefact, sourceNodeArtefact, model, /***/ conveyingLyph, counter, total}) => {
				enterState('DRAWING_PROCESS_LINE_NODE', {
					downEvent,
					parentArtefact,
					sourceNodeArtefact,
					model: C.Process.new({
						source: sourceNodeArtefact.model,
						target: C.Node.new(),
						conveyingLyph: [conveyingLyph]
					}),
					tooltipText: `${model.constructor.singular} (${counter+1}/${total})`
				}, { 'READY_TO_DRAW_PROCESS_LINE_NODE': data => ['READY_TO_DRAW_SUB_OMEGA_TREE', {
					...data,
					model,
					conveyingLyph: [...conveyingLyph.treeChildren][0], // TODO: allow branching (on omega-tree level)
					counter:       counter + 1,
					total
				}]});
			}
		}));
		
		/* drawing a process */
		branches.add([[C.Process], [Canvas, LyphRectangle, BorderLine, NodeGlyph], 'DRAWING_FIRST_PROCESS_LINE_NODE']);
		function getOrCreateNodeGlyph(downEvent, parentArtefact, model, sourceOrTarget) {
			let newNodeArtefact;
			if (parentArtefact instanceof NodeGlyph) {
				newNodeArtefact = parentArtefact;
				model[sourceOrTarget] = parentArtefact.model; // NOTE: overwriting model target
			} else {
				const p = downEvent.point.in(parentArtefact.inside);
				newNodeArtefact = new NodeGlyph({
					model : model[sourceOrTarget] || (model[sourceOrTarget] = C.Node.new()), // NOTE: possibly creating node model
					parent: parentArtefact,
					...p.obj()
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newNodeArtefact);
				}
			}
			return newNodeArtefact;
		}
		context.stateMachine.extend(({enterState, subscribe, intercept}) => ({
			'DRAWING_FIRST_PROCESS_LINE_NODE': ({downEvent, parentArtefact, model, tooltipText}) => {
				updateTooltip(tooltipText || `process (initial node)`, [
					`release the mouse-button when finished`
				]);
				/* either create or use existing node */
				const newNodeArtefact = getOrCreateNodeGlyph(downEvent, parentArtefact, model, 'source');
				/* allow the new node to be moved, then intercept the IDLE state to allow followups */
				enterState('MOVING', {
					mousedownVector: downEvent.point,
					movingArtefact:  newNodeArtefact
				}, { 'IDLE': ['READY_TO_DRAW_PROCESS_LINE_NODE', {
					sourceNodeArtefact: newNodeArtefact,
					model:              model
				}]});
			},
			'READY_TO_DRAW_PROCESS_LINE_NODE': ({sourceNodeArtefact, model, tooltipText}) => {
				updateTooltip(tooltipText || `process`, [
					`click and hold the left mouse button to create a new connected node`,
					`click on an existing node to connect to there`,
					`<kb style="border: solid 1px white; border-radius: 2px; padding: 0 1px; font-family: monospace">esc</kb> = close the current tool`
				]);
				this.e('mousedown')
					::filter(withoutMod('shift', 'meta')) // allowing ctrl to align with previous node
					::tap(stopPropagation)
					::withLatestFrom(context.p('selected'))
					::map(([downEvent, parentArtefact]) => ({
					downEvent         : downEvent,
					parentArtefact    : parentArtefact,
					model             : model,
					sourceNodeArtefact: sourceNodeArtefact
				}))
					::enterState('DRAWING_PROCESS_LINE_NODE');
				this.p('model')::skip(1)
					::filter(m => m && m !== model)
					::map(model => ({ model }))
					::enterState('READY_TO_DRAW_MODEL');
				this.p('model')::skip(1)
					::filter(m => !m)
					::enterState('IDLE');
				keydown
					::which(ESCAPE)
					::enterState('IDLE');
			},
			'DRAWING_PROCESS_LINE_NODE': ({downEvent, parentArtefact, model, sourceNodeArtefact, /***/ tooltipText}) => {
				updateTooltip(tooltipText || `process`, [
					`<kb style="border: solid 1px white; border-radius: 2px; padding: 0 1px; font-family: monospace">ctrl</kb> = snap to compass directions`,
					`release the mouse-button when finished`
				]);
				/* either create or use existing target node */
				const newNodeArtefact = getOrCreateNodeGlyph(downEvent, parentArtefact, model, 'target');
				/* create the new process line */
				let newProcessLine = new ProcessLine({
					model : model,
					parent: context.root,
					source: sourceNodeArtefact,
					target: newNodeArtefact
				});
				/* possibly create the conveying lyph rectangle */
				if ([...model.conveyingLyph].length > 0) {
					/* create conveying lyph rectangle */
					let newConveyingLyph = new LyphRectangle({
						model    : [...model.conveyingLyph][0],
						width    : 80, // TODO: set during drawing
						height   : 60, // TODO: adaptive height
						free     : false,
						draggable: false
					});
					/* perpetually control lyph positioning by node positioning */
					newProcessLine.p('parent')
						.subscribe((parent) => { parent.drop(newConveyingLyph) });
					combineLatest(
						sourceNodeArtefact.p('canvasTransformation')::map( m => Vector2D.fromMatrixTranslation(m, context.root.inside) ),
						newNodeArtefact   .p('canvasTransformation')::map( m => Vector2D.fromMatrixTranslation(m, context.root.inside) ),
						newConveyingLyph  .p('parent'),
						newConveyingLyph  .p('width'),
						newConveyingLyph  .p('height')
					).subscribe(([sourceVector, targetVector, parent, w, h]) => {
						sourceVector = sourceVector.in(parent.inside);
						targetVector = targetVector.in(parent.inside);
						// TODO: a quick fix follows to set a minimum size for the rectangle,
						//     : but this should be based on the actual lyph rectangle that would be created.
						newConveyingLyph.transformation = ID_MATRIX
							.translate        ( ...sourceVector.partwayTo(0.5, targetVector).xy )
							::rotateFromVector( ...targetVector.minus(sourceVector).xy          )
							.translate        ( -w/2, -h/2                                      );
					});
				}
				/* allow the new node to be moved, then intercept the IDLE state to allow followups */
				enterState('MOVING', {
					mousedownVector: downEvent.point,
					movingArtefact:  newNodeArtefact,
					referencePoint:  Vector2D.fromMatrixTranslation(sourceNodeArtefact.canvasTransformation, context.root.inside)
				}, { 'IDLE': ['READY_TO_DRAW_PROCESS_LINE_NODE', {
					sourceNodeArtefact: newNodeArtefact,
					model:              model // TODO: Should maybe new process model, not an existing one?
				}]});
			}
		}));
		
		
		
		
	}
	
	
}

