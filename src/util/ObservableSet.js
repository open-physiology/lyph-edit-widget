import {Subject}         from 'rxjs/Subject';
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {merge}           from "rxjs/operator/merge";
import {map}             from "rxjs/operator/map";
import assert    from 'power-assert';
import {humanMsg} from "./misc";

const $$set               = Symbol('$$set');
const $$addSubject        = Symbol('$$addSubject');
const $$deleteSubject     = Symbol('$$deleteSubject');
const $$valueObservable      = Symbol('$$valueObservable');
const $$disableNextReplay = Symbol('$$disableNextReplay');

class AddReplaySubject extends Subject {
	constructor(initialSet) {
		super();
		assert(initialSet[Symbol.iterator]);
		this._setReference = initialSet;
	}
	normalSubscribe(...args) {
		this[$$disableNextReplay] = true;
		return this.subscribe(...args);
	}
	// noinspection JSDuplicatedDeclaration
	_subscribe(subscriber) {
		const subscription = super._subscribe(subscriber);
		if (subscription && !subscription.isUnsubscribed && !this[$$disableNextReplay]) {
			this._setReference.forEach(::subscriber.next);
		}
		this[$$disableNextReplay] = false;
		return subscription;
	}
}


export default class ObservableSet extends Set {
	
	constructor(initialContent = []) {
		super();
		
		this[$$addSubject] = new AddReplaySubject(this);
		this[$$addSubject].normalSubscribe(::this.add);
		
		this[$$deleteSubject] = new Subject();
		this[$$deleteSubject].subscribe(::this.delete);
		
		initialContent.forEach(::this.add);
		
		let valueSubject = new BehaviorSubject(new Set(this));
		this[$$addSubject]   .normalSubscribe(() => { valueSubject.next(new Set(this)) });
		this[$$deleteSubject].subscribe      (() => { valueSubject.next(new Set(this)) });
		this[$$valueObservable] = valueSubject.asObservable();
	}
	
	e(op) {
		switch (op) {
			case 'add':    { return this[$$addSubject]    }
			case 'delete': { return this[$$deleteSubject] }
			default: assert(false, humanMsg`
				The ${op} event does not exist.
			`);
		}
	}
	
	p(name) {
		switch (name) {
			case 'value': { return this[$$valueObservable] }
			default: assert(false, humanMsg`
				The ${name} property does not exist.
			`);
		}
	}
	
	add(obj) {
		if (!this.has(obj)) {
			super.add(obj);
			this.e('add').next(obj);
		}
		return this;
	}
	delete(obj) {
		if (this.has(obj)) {
			super.delete(obj);
			this.e('delete').next(obj);
			return true;
		}
		return false;
	}
	clear() {
		for (let value of this) { this.delete(value) }
		return this;
	}
}

export function setEquals(setA, setB) {
	setA = new Set(setA);
	setB = new Set(setB);
	if (setA.size !== setB.size) return false;
	for (var a of setA) if (!setB.has(a)) return false;
	return true;
}

export function copySetContent(reference, newContent) {
	newContent = new Set(newContent);
	for (let e of reference) {
		if (!newContent.has(e)) {
			reference.delete(e);
		}
	}
	for (let e of newContent) {
		if (!reference.has(e)) {
			reference.add(e);
		}
	}
}
