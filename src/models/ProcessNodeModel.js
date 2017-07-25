import {property, flag, humanMsg} from 'utilities';
import {at} from 'lodash-bound';

import assert from 'power-assert';

import {Model} from './Model.js';
import {createSVGMatrix} from '../util/svg';

export class ProcessNodeModel extends Model {
	
	@property()                                         parent;
	@property({ isValid: v => v instanceof SVGMatrix }) transformation;
	@property({ initial: '' })                          type;
	@flag({ initial: false })                           internal;
	
	toJSON() {
		return {
			...super.toJSON(),
			parent: this.parent && this.parent.id,
			transformation: this.transformation::at('a', 'b', 'c', 'd', 'e', 'f'),
			internal: this.internal,
			type: this.type
		};
	}
	
	
	static fromJSON(json, context = {}) {
		const result = super.fromJSON(json, context);
		const {modelsById} = context;
		assert(!json.parent || modelsById[json.parent], humanMsg`
			Got a reference to a model with id ${json.parent},
			but such a model has not yet been seen.
		`);
		result.parent = json.parent && modelsById[json.parent];
		result.transformation = createSVGMatrix(...json.transformation);
		result.internal = json.internal;
		result.type = json.type;
		return result;
	}
	
}
