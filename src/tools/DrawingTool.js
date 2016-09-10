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

import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {ID_MATRIX} from "../util/svg";
import {svgPageCoordinates, log} from "../util/rxjs";
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

const C = window.module.classes;


export default class DrawingTool extends Tool {
	
	@property({ initial: null }) model;
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		this.p('model')::map(c=>!!c).subscribe( this.p('active') );
		this.p('active')::filter(a=>!a)::map(c=>null).subscribe( this.p('model') );
		
		this.p('active')::map(a=>!a).subscribe( context.PanTool     .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.DragDropTool.p('active') );
		this.p('active')::map(a=>!a).subscribe( context.ResizeTool  .p('active') );
		
		this.trackMouseDownMoveUp();
	}
	
	getMouseDownMoveUpProcedure(data) {
		if (C.Lyph               .hasInstance(this.model)) { return this.drawLyphRectangle               (data) }
		if (C.Node               .hasInstance(this.model)) { return this.drawNodeGlyph                   (data) }
		if (C.Process            .hasInstance(this.model)) { return this.drawProcessLine                 (data) }
		if (C.CoalescenceScenario.hasInstance(this.model)) { return this.drawCoalescenceScenarioRectangle(data) }
		
		// TODO
		
	}
	
	drawLyphRectangle({selectedArtefactA}) {
		if (!(selectedArtefactA instanceof Canvas ||
		      selectedArtefactA instanceof LyphRectangle)) { return }
		let model = this.model;
		return {
			onMouseDown(data) {
				const {pointA} = data;
				data.newArtefact = new LyphRectangle({
					model   : model,
					parent  : selectedArtefactA, // TODO: specific types of parentage (layer, part, segment, ...) so that the 'drop' code below is not needed
					x       : pointA.x,
					y       : pointA.y,
					width   : 10,  // TODO: use minimal width/height
					height  : 10,
					dragging: true // TODO: 'resizing' or 'creating'
				});
				if (selectedArtefactA.drop::isFunction()) {
					selectedArtefactA.drop(data.newArtefact);
				}
				data.newArtefact.dragging = true;
			},
			onMouseMove({newArtefact, pointA: a, pointB: b}) {
				newArtefact.width          = Math.abs(a.x - b.x);
				newArtefact.height         = Math.abs(a.y - b.y);
				newArtefact.transformation = ID_MATRIX.translate(Math.min(a.x, b.x), Math.min(a.y, b.y));
			},
			onMouseUp({newArtefact}) {
				this.active          = false;
				newArtefact.dragging = false; // TODO: 'resizing' or 'creating'
			}
		};
	}
	
	drawCoalescenceScenarioRectangle({selectedArtefactA}) {
		if (!(selectedArtefactA instanceof Canvas)) { return }
		let model = this.model;
		return {
			onMouseDown(data) {
				const {pointA} = data;
				data.newArtefact = new CoalescenceScenarioRectangle({
					model   : model,
					parent  : selectedArtefactA,
					x       : pointA.x,
					y       : pointA.y,
					width   : 10,  // TODO: use minimal width/height
					height  : 10,
					rotation: 90,
					dragging: true // TODO: 'resizing' or 'creating'
				});
				if (selectedArtefactA.drop::isFunction()) {
					selectedArtefactA.drop(data.newArtefact);
				}
				data.newArtefact.dragging = true;
			},
			onMouseMove({newArtefact, pointA: a, pointB: b}) {
				newArtefact.width          = Math.abs(a.x - b.x);
				newArtefact.height         = Math.abs(a.y - b.y);
				newArtefact.transformation = ID_MATRIX.translate(Math.min(a.x, b.x), Math.min(a.y, b.y));
			},
			onMouseUp({newArtefact}) {
				this.active          = false;
				newArtefact.dragging = false; // TODO: 'resizing' or 'creating'
			}
		};
	}
	
	drawNodeGlyph({selectedArtefactA}) {
		if (!(selectedArtefactA instanceof Canvas        ||
		      selectedArtefactA instanceof LyphRectangle ||
              selectedArtefactA instanceof BorderLine    )) { return }
		// TODO: ^ use a more general way to specify and check these
		let model = this.model;
		return {
			onMouseDown(data) {
				const {pointA} = data;
				data.newArtefact = new NodeGlyph({
					model   : model,
					parent  : selectedArtefactA,
					x       : pointA.x,
					y       : pointA.y,
					dragging: true // TODO: 'resizing' or 'creating'
				});
				data.newArtefact.dragging = true;
			},
			onMouseMove({newArtefact, pointB: b}) {
				newArtefact.transformation = ID_MATRIX.translate(b.x, b.y);
			},
			onMouseUp({selectedArtefactB, newArtefact}) {
				if (selectedArtefactB.drop::isFunction()) {
					selectedArtefactB.drop(newArtefact);
				}
				this.active          = false;
				newArtefact.dragging = false; // TODO: 'resizing' or 'creating'
			}
		};
	}
	
	drawProcessLine({selectedArtefactA}) {
		if (!(selectedArtefactA instanceof Canvas        ||
		      selectedArtefactA instanceof LyphRectangle ||
              selectedArtefactA instanceof BorderLine    )) { return }
		let model = this.model;
		return {
			onMouseDown(data) {
				const {pointA} = data;
				data.newSourceNode = new NodeGlyph({
					model   : model.source,
					parent  : selectedArtefactA,
					x       : pointA.x,
					y       : pointA.y,
					dragging: false
				});
				if (selectedArtefactA.drop::isFunction()) {
					selectedArtefactA.drop(data.newSourceNode);
				}
				data.newTargetNode = new NodeGlyph({
					model   : model.target,
					parent  : selectedArtefactA,
					x       : pointA.x,
					y       : pointA.y,
					dragging: true
				});
				data.newProcessLine = new ProcessLine({
					model   : model,
					parent  : this.context.root,
					source  : data.newSourceNode,
					target  : data.newTargetNode,
					dragging: true
				});
				data.newTargetNode .dragging = true;
				data.newProcessLine.dragging = true;
				console.log(model); // TODO
				if (model.conveyingLyph && C.Lyph.hasInstance([...model.conveyingLyph][0])) {
					data.newConveyingLyph = new LyphRectangle({
						model   : [...model.conveyingLyph][0],
						parent  : this.context.root,
						width   : 100,
						height  : 60, // TODO: adaptive height
						dragging: true
					});
				}
			},
			onMouseMove({newTargetNode, newConveyingLyph, pointA: a, pointB: b}) {
				newTargetNode.transformation = ID_MATRIX.translate(b.x, b.y);
				if (newConveyingLyph && (b.x-a.x) !== 0 && (b.y-a.y) !== 0) {
					// default orientation: a ---> b
					newConveyingLyph.width = Math.sqrt(Math.pow(Math.abs(b.x-a.x), 2) + Math.pow(Math.abs(b.y-a.y), 2)) - 40;
					let w = newConveyingLyph.width;
					let h = newConveyingLyph.height;
					newConveyingLyph.transformation = ID_MATRIX
						.translate(
							(a.x + b.x) / 2,
							(a.y + b.y) / 2
						)
						.rotateFromVector(b.x-a.x, b.y-a.y)
						.translate(-w/2, -h/2);
				}
			},
			onMouseUp({selectedArtefactB, newTargetNode, newProcessLine}) {
				if (selectedArtefactB.drop::isFunction()) {
					selectedArtefactB.drop(newTargetNode);
				}
				this.active             = false;
				newTargetNode.dragging  = false;
				newProcessLine.dragging = false;
				
				// TODO: process and conveying lyph should get closest common parent of the two nodes
			}
		};
	}
	
	
	
	
}

