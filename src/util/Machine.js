import isArray     from 'lodash-bound/isArray';
import isUndefined from 'lodash-bound/isUndefined';
import isFunction  from 'lodash-bound/isFunction';
import isString    from 'lodash-bound/isString';
import constant    from 'lodash-bound/constant';
import toPairs     from 'lodash-bound/toPairs';
import {entries}   from 'bound-native-methods';

export default class Machine {
	
	subscriptions = [];
	desc          = {};
	state         = null;
	data          = null;
	interceptors  = {};
	
	constructor(initialState, initialData) {
		this.state = initialState;
		this.data  = initialData;
	}
	
	registerInterceptor(state, interceptor) {
		if (interceptor::isString())   { interceptor = [interceptor, {}]       }
		if (interceptor::isArray())    { interceptor = interceptor::constant() }
		if (!this.interceptors[state]) { this.interceptors[state] = []         }
		this.interceptors[state].push(interceptor);
	}
	
	runInterceptor(state, data) {
		while (this.interceptors[state]::isArray()) {
			let interceptor = this.interceptors[state].pop();
			if (!interceptor::isFunction()) { break }
			let result = interceptor(data);
			if (!result::isArray()) { break }
			console.info(`intercepting state: '${state}'`, [data]);
			[state, data] = result;
		}
		return [state, data];
	}
	
	extend(descFn) {
		/* define bound convenience functions */
		const thisMachine = this;
		const boundFunctions = {
			enterState: function (nextState, data, newInterceptors) {
				if (this::isUndefined()) {
					return thisMachine.enterState(nextState, data, newInterceptors);
				} else {
					return this::(boundFunctions.subscribe)((data) => {
						thisMachine.enterState(nextState, data, newInterceptors);
					});
				}
			},
			subscribe: function (...args) {
				const sub = this.subscribe(...args);
				thisMachine.subscriptions.push(sub);
				return sub;
			},
			intercept: function (...args) {
				thisMachine.registerInterceptor(...args);
			}
		};
		/* extend descriptions */
		let result = descFn(boundFunctions);
		for (let [key, fn] of result::toPairs()) {
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
	
	enterState(state, data, newInterceptors) {
		this.unsubscribe();
		[state, data] = this.runInterceptor(state, data);
		for (let newInterceptor of newInterceptors::toPairs()) {
			this.registerInterceptor(...newInterceptor);
		}
		console.info(`entering state: '${state}'`, [data]);
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
