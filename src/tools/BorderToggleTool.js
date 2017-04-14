import {isArray} from 'lodash-bound';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
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
			.do(stopPropagation)
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

