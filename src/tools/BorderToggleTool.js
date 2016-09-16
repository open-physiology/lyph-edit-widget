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
import isArray from 'lodash-bound/isArray';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor} from "../util/rxjs";
import BorderLine from "../artefacts/BorderLine";
import {tap} from "../util/rxjs";


export default class BorderToggleTool extends Tool {
	
	constructor(context) {
		super(context);
		
		const {root} = context;
		
		this.rootE('click')
			::filter(withoutMod('ctrl', 'shift', 'meta'))
			::withLatestFrom(context.p('selected'), (event, artefact) => {
				event.artefact = artefact;
				return event;
			})
			::filter(({artefact}) => artefact instanceof BorderLine)
			::tap(stopPropagation)
			.subscribe(({artefact: borderLine}) => {
				if (!borderLine.model.nature::isArray()) {
					borderLine.model.nature = [borderLine.model.nature];
				}
				if (borderLine.model.nature.length === 2 || borderLine.model.nature[0] === 'closed') {
					borderLine.model.nature = ['open'];
				} else {
					borderLine.model.nature = ['closed'];
				}
			});
		
	}
	
	
	
}

