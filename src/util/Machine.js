import isArray     from 'lodash-bound/isArray';
import entries     from 'lodash-bound/entries';
import isUndefined from 'lodash-bound/isUndefined';

export default class Machine {
	
	subscriptions = [];
	desc          = {};
	state         = null;
	data          = null;
	
	constructor(initialState, initialData) {
		this.state = initialState;
		this.data  = initialData;
	}
	
	extend(descFn) {
		/* define bound convenience functions */
		const thisMachine = this;
		const boundFunctions = {
			enterState: function (nextState, data) {
				if (this::isUndefined()) {
					return thisMachine.enterState(nextState, data);
				} else {
					return this::(boundFunctions.subscribe)((data) => {
						thisMachine.enterState(nextState, data);
					});
				}
			},
			subscribe: function (...args) {
				const sub = this.subscribe(...args);
				thisMachine.subscriptions.push(sub);
				return sub;
			}
		};
		/* extend descriptions */
		let result = descFn(boundFunctions);
		for (let [key, fn] of result::entries()) {
			if (thisMachine.desc[key]::isUndefined()) {
				thisMachine.desc[key] = new Set();
			}
			thisMachine.desc[key].add(fn);
		}
		/* run if it says something about the current state */
		if (this.state in result) {
			this.enterSpecifiedState(result[this.state]);
		}
		/* return machine itself */
		return this;
	}
	
	unsubscribe() {
		for (let sub of this.subscriptions.reverse()) {
			sub.unsubscribe();
		}
		this.subscriptions = [];
	}
	
	enterState(state, data) {
		this.unsubscribe();
		console.info(`entering state: '${state}'`, data);
		this.state = state;
		this.data  = data;
		this.desc[state].forEach( ::this.enterSpecifiedState );
	}
	
	enterSpecifiedState(specifiedStateFn) {
		let specifiedState = specifiedStateFn(this.data);
		if (specifiedState::isUndefined()) { specifiedState = []               }
		if (!specifiedState::isArray())    { specifiedState = [specifiedState] }
		this.subscriptions.push(...specifiedState);
	}
	
};
