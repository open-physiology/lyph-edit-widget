import {ValueTracker, property, flag} from 'utilities';
import chroma from 'chroma-js';
import {isUndefined, pick, parseInt} from 'lodash-bound';
import {uniqueId as _uniqueId} from 'lodash';
import assert from 'power-assert';

export class Model extends ValueTracker {
	
	////////////////////////////////////////////////////////////////////////////
	
	@property() id;
	@property() name;
	@property({ initial: 'white' }) color;
	
	@flag({ initial: false }) deleted;
	@flag({ initial: false }) selected;
	@flag({ initial: false }) wasSetFromData;
	
	////////////////////////////////////////////////////////////////////////////
	
	constructor({id, modelsById} = {}) {
		super();
		
		this.setValueTrackerOptions({
			takeUntil: this.p('deleted').filter(v=>!!v)
		});
		
		if (id::isUndefined()) {
			let newId;
			do {
				newId = _uniqueId()::parseInt();
			} while (modelsById[newId]);
			this.id = newId;
		} else {
			this.id = id;
		}
		
		this.class = this.constructor.name;
	}
	
	delete() { this.deleted = true }
	
	toJSON() {
		return {
			'class': this.constructor.name,
			...this::pick('id', 'name', 'color', 'wasSetFromData')
		};
	}
	
	static fromJSON(json, {modelClasses, modelsById} = {}) {
		const cls = modelClasses[json.class];
		const result = new cls({modelsById});
		result.id    = json.id;
		result.name  = json.name;
		result.color = json.color;
		result.wasSetFromData = json.wasSetFromData;
		return result;
	}
	
	setFromData(data, context) {
		assert(!this.wasSetFromData);
		this.wasSetFromData = true;
	}
	
	////////////////////////////////////////////////////////////////////////////
	
	// get contrastingColor() {
	// 	const c = chroma(this.color);
	// 	if (c.luminance() < 0.5) {
	// 		return c.luminance(0.9);
	// 	} else {
	// 		return c.luminance(0.1);
	// 	}
	// }
	//
	// get darkenedColor() {
	// 	return chroma(this.color).darken(2).hex();
	// }
	
	////////////////////////////////////////////////////////////////////////////
	
}
