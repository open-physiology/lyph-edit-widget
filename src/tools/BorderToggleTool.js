import $ from 'jquery';
// TODO: no longer need to import: fromEvent;
// TODO: no longer need to import: of;
// TODO: make sure we don't need to import: switchMap;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: withLatestFrom;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: concat;

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
			.filter(withoutMod('ctrl', 'shift', 'meta'))
			.withLatestFrom(context.p('selected'), (event, artefact) => {
				event.artefact = artefact;
				return event;
			})
			.filter(({artefact}) => artefact instanceof BorderLine)
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

