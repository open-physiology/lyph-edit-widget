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
import {ID_MATRIX} from "../util/svg";
import {svgPageCoordinates, log} from "../util/rxjs";
import {combineLatest} from "rxjs/observable/combineLatest";
import LyphRectangle from "../artefacts/LyphRectangle";
import {merge} from "rxjs/observable/merge";
import Canvas from "../artefacts/Canvas";
import {tap} from "../util/rxjs";

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
		
		merge( this.e('mousedown'), this.rootE('mousedown') )
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			::tap(stopPropagation)
			::withLatestFrom(context.p('selected'), this.p('model'))
			::afterMatching(mousemove::take(4), mouseup)
			.subscribe(([down, selectedArtefact, model]) => {
				
				/* only drawing lyphs for now */ // TODO: draw artefacts for other types of models
				if (!classes.Lyph.hasInstance(model))                                                   { return }
				if (!(selectedArtefact instanceof Canvas || selectedArtefact instanceof LyphRectangle)) { return }

				const M = root.inside.getTransformToElement(selectedArtefact.element);
				
				let pointA = down.point.matrixTransform(M);
				
				let artefact = new LyphRectangle({
					model: model,
					parent: selectedArtefact,
					x:        pointA.x,
					y:        pointA.y,
					width:    10,    // TODO: use minimal width/height
					height:   10,    //
					dragging: true   // TODO: 'resizing' or 'creating'
				});
				
				/* move while dragging */
				of(down)::concat(mousemove::takeUntil(mouseup))
					// ::map(svgPageCoordinates)
					::map(xy => xy.point.matrixTransform(M))
					.subscribe(({x: xb, y: yb}) => {
						let {x: xa, y: ya} = pointA;
						artefact.width  = Math.abs(xa - xb);
						artefact.height = Math.abs(ya - yb);
						artefact.transformation = ID_MATRIX.translate(Math.min(xa, xb), Math.min(ya, yb));
					});

				/* stop dragging and drop */
				mouseup::take(1).subscribe(() => {
					this.active = false;
					artefact.dragging = false; // TODO: 'resizing' or 'creating'
			    });

			});
		
	}
	
	
	
}

