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

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {POINT} from "../util/svg";
import {svgPageCoordinates, log} from "../util/rxjs";
import {combineLatest} from "rxjs/observable/combineLatest";
import LyphRectangle from "../artefacts/LyphRectangle";
import {merge} from "rxjs/observable/merge";
import Canvas from "../artefacts/Canvas";

const classes = window.module.classes;


export default class DrawingTool extends Tool {
	
	@property({ initial: null }) model;
	
	constructor(context) {
		super(context, { events: ['mousedown'] });
		
		this.p('model')::map(c=>!!c).subscribe( this.p('active') );
		this.p('active')::filter(a=>!a)::map(c=>null).subscribe( this.p('model') );
		
		this.p('active')::map(a=>!a).subscribe( context.PanTool     .p('active') );
		this.p('active')::map(a=>!a).subscribe( context.DragDropTool.p('active') );
		
		const {root} = context;
		
		const mousemove = this.windowE('mousemove')::filter(() => this.active);
		const mouseup   = this.windowE('mouseup'  )::filter(() => this.active);
		
		merge(
			this.e('mousedown'),
			this.rootE('mousedown')
		)
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			.do(stopPropagation)
			::withLatestFrom(context.p('selected'), this.p('model'))
			::afterMatching(mousemove::take(4), mouseup)
			.subscribe(([down, selectedArtefact, model]) => {
				
				/* only drawing lyphs for now */ // TODO: draw artefacts for other types of models
				if (!classes.Lyph.hasInstance(model))                                                   { return }
				if (!(selectedArtefact instanceof Canvas || selectedArtefact instanceof LyphRectangle)) { return }

				const startMatrix = root.element.getTransformToElement(selectedArtefact.element);
				
				let startXY = svgPageCoordinates(down).matrixTransform(startMatrix);
				let offset = root.element.jq.offset();
				startXY.x = startXY.x + offset.left;
				startXY.y = startXY.y + offset.top;
				
				let artefact = new LyphRectangle({
					model: model,
					parent: selectedArtefact,
					x:        startXY.x,
					y:        startXY.y,
					width:    10,    // TODO: use minimal width/height
					height:   10,    //
					dragging: true   // TODO: 'resizing' or 'creating'
				});
				
				/* move while dragging */
				of(down)::concat(mousemove::takeUntil(mouseup))
					::map(svgPageCoordinates)
					::map(xy => xy.matrixTransform(startMatrix))
					.subscribe(({x, y}) => {
						artefact.width  = x - startXY.x;
						artefact.height = y - startXY.y;
					});

				/* stop dragging and drop */
				mouseup::take(1).subscribe(() => {
					this.active = false;
					artefact.dragging = false; // TODO: 'resizing' or 'creating'
			    });

			});
		
	}
	
	
	
}

