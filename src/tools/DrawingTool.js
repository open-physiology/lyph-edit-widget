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
		
		const {root} = context;
		
		const mousemove = fromEvent($(window), 'mousemove');
		const mouseup   = fromEvent($(window), 'mouseup'  );
		
		
		merge(
			this.e('mousedown'),
			fromEvent(root.handle.jq, 'mousedown')
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
				
				let artefact = new LyphRectangle({
					model: model,
					parent: selectedArtefact,
					...startXY::pick('x', 'y'),
					width:  10, // TODO: use minimal width/height
					height: 10, //
					dragging: true // TODO: 'resizing' or 'creating'
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

