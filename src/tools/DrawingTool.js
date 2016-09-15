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

const C = window.module.classes;


export default class DrawingTool extends Tool {
	
	@property({ initial: null }) model;
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		const mousemove = this.windowE('mousemove', false);
		const mouseup   = this.windowE('mouseup',   false);
		
		this.p('model')::map(c=>!!c).subscribe( this.p('active') );
		this.p('active')::filter(a=>!a)::map(c=>null).subscribe( this.p('model') );
		
		this.p('active')::map(a=>!a).subscribe( context.PanTool         .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.DragDropTool    .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.ResizeTool      .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.BorderToggleTool.p('active') );
		// TODO: remove the 'active' property from tools, now that we have state machines
		
		/* preparing to draw a given model */
		const branches = new Set();
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'IDLE'                 : () => {
				this.model = null;
				this.p('model')
					::filter(m => !!m)
					::map(model => ({ model }))
					::enterState('READY_TO_DRAW_MODEL');
			},
			'READY_TO_DRAW_MODEL'  : ({ model }) => [
				this.e('mousedown')
					::filter(withoutMod('ctrl', 'shift', 'meta'))
					::tap(stopPropagation)
					::withLatestFrom(context.p('selected'))
					::map(([downEvent, parentArtefact]) => ({
					downEvent     : downEvent,
					parentArtefact: parentArtefact,
					model         : model
				}))
					::enterState('STARTED_DRAWING_MODEL'),
				this.p('model')
					::filter(m => m && m !== model)
					::map(model => ({ model }))
					::enterState('READY_TO_DRAW_MODEL'),
				this.p('model')
					::filter(m => !m)
					::enterState('IDLE')
			],
			'STARTED_DRAWING_MODEL': ({ downEvent, parentArtefact, model }) => {
				const modelIs  = (classes) => classes.some(cls => cls.hasInstance(model));
				const parentIs = (classes) => classes.some(cls => parentArtefact instanceof cls);
				const [,,nextState] = [...branches]::find(([mCls, pCls]) => modelIs(mCls) && parentIs(pCls));
				enterState(nextState, { downEvent, parentArtefact, model });
			}
		}));
		
		/* drawing a lyph rectangle */
		branches.add([[C.Lyph], [Canvas, LyphRectangle], 'DRAWING_LYPH_RECTANGLE']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_LYPH_RECTANGLE': ({downEvent, parentArtefact, model}) => {
				const p = downEvent.point.in(parentArtefact.inside);
				const newArtefact = new LyphRectangle({
					model   : model,
					parent  : parentArtefact, // TODO: specific types of parentage (layer, part, segment, ...) so that the 'drop' code below is not needed
					x       : p.x,
					y       : p.y,
					width   : 1, // TODO: use minimal width/height
					height  : 1
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
				const p = downEvent.point.in(parentArtefact.inside);
				const newArtefact = new CoalescenceScenarioRectangle({
					model   : model,
					parent  : parentArtefact,
					x       : p.x,
					y       : p.y,
					width   : 1,
					height  : 1
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
				const p = downEvent.point.in(parentArtefact.inside);
				let newArtefact = new NodeGlyph({
					model   : model,
					parent  : parentArtefact,
					x       : p.x,
					y       : p.y
				});
				if (parentArtefact.drop::isFunction()) {
					parentArtefact.drop(newArtefact);
				}
				enterState('MOVING', {
					downEvent:      downEvent,
					movingArtefact: newArtefact
				});
			}
		}));
		
		/* drawing a process */
		branches.add([[C.Process], [Canvas, LyphRectangle, BorderLine, NodeGlyph], 'DRAWING_PROCESS_LINE_SOURCE']);
		context.stateMachine.extend(({enterState, subscribe}) => ({
			'DRAWING_PROCESS_LINE_SOURCE': ({downEvent, parentArtefact, model}) => {
				/* either create or use existing source node */
				let sourceNodeArtefact, x1, y1;
				if (parentArtefact instanceof NodeGlyph) {
					sourceNodeArtefact = parentArtefact;
					model.source = parentArtefact.model;
					x1 = sourceNodeArtefact.canvasTransformation[tX];
					y1 = sourceNodeArtefact.canvasTransformation[tY];
				} else {
					const p = downEvent.point.in(parentArtefact.inside);
					x1 = downEvent.point.x;
					y1 = downEvent.point.y;
					sourceNodeArtefact = new NodeGlyph({
						model   : model.source || (model.source = C.Node.new()),
						parent  : parentArtefact,
						x       : p.x,
						y       : p.y
					});
					if (parentArtefact.drop::isFunction()) {
						parentArtefact.drop(sourceNodeArtefact);
					}
				}
				
				let rectIndicator;
				if (model.conveyingLyph && C.Lyph.hasInstance([...model.conveyingLyph][0])) {
					rectIndicator = context.root.foreground.svg.rect().attr({
						strokeWidth:   '1px',
						stroke:        'black',
						fill:          'none',
						pointerEvents: 'none',
						height:         60
					}).node::enrichDOM();
				}
				let lineIndicator = context.root.foreground.svg.line().attr({
					strokeWidth:   '1px',
					stroke:        'red',
					pointerEvents: 'none',
					strokeLinecap: 'round',
					x1, y1
				}).node::enrichDOM();
				
				enterState('DRAWING_PROCESS_LINE_TARGET', {
					x1, y1,
					downEvent:          downEvent,
					sourceNodeArtefact: sourceNodeArtefact,
					model:              model,
					lineIndicator:      lineIndicator,
					rectIndicator:      rectIndicator
				});
			},
			'DRAWING_PROCESS_LINE_TARGET': ({x1, y1, downEvent, sourceNodeArtefact, model, lineIndicator, rectIndicator}) => {
				/* move indicators while moving mouse */
				let rectIndicatorTransformation;
				of(downEvent)::concat(mousemove)
					::map(event => event.point)
					::subscribe(({x: x2, y: y2}) => {
						lineIndicator.jq.attr({ x2, y2 });
						if (rectIndicator) {
							let w = Math.sqrt(Math.pow(Math.abs(x2-x1), 2) + Math.pow(Math.abs(y2-y1), 2)) - 40;
							let h = rectIndicator.jq.attr('height');
							// TODO: a quick fix follows to set a minimum size for the rectangle,
							//     : but this should be based on the actual lyph rectangle that would be created.
							w = Math.max(2, w);
							h = Math.max(2, h);
							rectIndicator.jq.attr('width', w);
							rectIndicatorTransformation = ID_MATRIX
								.translate        ( (x1+x2) / 2, (y1+y2) / 2  )
								::rotateFromVector(  x2-x1,       y2-y1       )
								.translate        ( -w/2,        -h/2         );
							rectIndicator::setCTM(rectIndicatorTransformation);
						}
					});
				
				/* drop target node, create process and target node */
				mouseup
					::withLatestFrom(context.p('selected'))
					::tap(([upEvent, parentArtefact]) => {
						/* either create or use existing target node */
						let targetNodeArtefact;
						if (parentArtefact instanceof NodeGlyph) {
							targetNodeArtefact = parentArtefact;
							model.target = parentArtefact.model;
						} else {
							const p = upEvent.point.in(parentArtefact.inside);
							targetNodeArtefact = new NodeGlyph({
								model : model.target || (model.target = C.Node.new()),
								parent: parentArtefact,
								x     : p.x,
								y     : p.y
							});
							if (parentArtefact.drop::isFunction()) {
								parentArtefact.drop(targetNodeArtefact);
							}
						}
						/* closest common ancestor */
						let cca = closestCommonAncestor(sourceNodeArtefact, targetNodeArtefact);
						/* create conveying lyph rectangle */
						if (rectIndicator) {
							rectIndicatorTransformation = context.root.inside.getTransformToElement(cca.inside)
								.multiply(rectIndicatorTransformation);
							let newConveyingLyph = new LyphRectangle({
								model         : [...model.conveyingLyph][0],
								parent        : cca,
								width         : parseFloat(rectIndicator.jq.attr('width') ),
								height        : parseFloat(rectIndicator.jq.attr('height')), // TODO: adaptive height
								transformation: rectIndicatorTransformation,
								free          : false,
								draggable     : false
							});
							cca.drop(newConveyingLyph);
							rectIndicator.jq.remove();
							
							/* control lyph positioning by nodes */
							combineLatest(
								sourceNodeArtefact.p('transformation')::map( ::Vector2D.fromMatrixTranslation ),
								targetNodeArtefact.p('transformation')::map( ::Vector2D.fromMatrixTranslation )
							).subscribe(([{x: x1, y: y1}, {x: x2, y: y2}]) => {
								let w = Math.sqrt(Math.pow(Math.abs(x2-x1), 2) + Math.pow(Math.abs(y2-y1), 2)) - 40;
								let h = newConveyingLyph.height;
								// TODO: a quick fix follows to set a minimum size for the rectangle,
								//     : but this should be based on the actual lyph rectangle that would be created.
								newConveyingLyph.width = w;
								newConveyingLyph.transformation = ID_MATRIX
									.translate        ( (x1+x2) / 2, (y1+y2) / 2  )
									::rotateFromVector(  x2-x1,       y2-y1       )
									.translate        ( -w/2,        -h/2         );
							});
							
						}
						/* create the new process line */
						new ProcessLine({
							model : model,
							parent: cca,
							source: sourceNodeArtefact,
							target: targetNodeArtefact
						});
						lineIndicator.jq.remove();
						// TODO: automatically make a process-line a child of
						//     : the the closest common ancestor of its nodes
					})
					::enterState('IDLE');
			}
		}));
		
		
		
		
	}
	
	
}

