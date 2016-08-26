import $ from 'jquery';
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
import BorderLine from "../artefacts/BorderLine";


export default class BorderToggleTool extends Tool {
	
	constructor(context) {
		super(context);
		
		const {root} = context;
		
		const click = this.rootE('click');
		
		click
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			::withLatestFrom(context.p('selected'), (event, artefact) => {
				event.artefact = artefact;
				return event;
			})
			::filter(({artefact}) => artefact instanceof BorderLine)
			.do(stopPropagation)
			.subscribe(({artefact: borderLine}) => {
				if (Array.isArray(borderLine.model.nature) || borderLine.model.nature === 'closed') {
					borderLine.model.nature = 'open';
				} else {
					borderLine.model.nature = 'closed';
				}
			});
		
	}
	
	
	
}

