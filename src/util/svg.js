import $ from '../libs/jquery';
import Snap from '../libs/snap.svg';
import {args} from './misc';
import {assign} from 'bound-native-methods';
import pick from 'lodash-bound/pick';
import ValueTracker from './ValueTracker';
import {merge} from 'rxjs/observable/merge';
import {log} from './rxjs';
import {filter} from "rxjs/operator/filter";
import {map} from "rxjs/operator/map";

import assert from 'power-assert';

import {humanMsg} from './misc';
import minBy from 'lodash-bound/minBy';

const {abs, atan2, sqrt} = Math;

export const M11 = 'a';
export const M12 = 'c';
export const M21 = 'b';
export const M22 = 'd';
export const tX  = 'e';
export const tY  = 'f';

export const refSVG    = document.createElementNS("http://www.w3.org/2000/svg", "svg");
export const refSnap   = Snap(refSVG);
export const ID_MATRIX = refSVG.createSVGMatrix();
export const POINT     = refSVG.createSVGPoint();

export function createMatrix(a, b, c, d, e, f) {
	let result = refSVG.createSVGMatrix();
	result::assign({a, b, c, d, e, f});
	return result;
}

export function createSVGPoint(x, y) {
	let result = refSVG.createSVGPoint();
	result.x = x;
	result.y = y;
	return result;
}

export function matrixEquals(M1, M2) {
	return ['a', 'b', 'c', 'd', 'e', 'f']
		.every(key => M1[key] === M2[key]);
}

export function setVirtualParent(artefact) {
	let vpt = $(this).data('virtualParentTracker');
	if (!vpt) {
		vpt = new ValueTracker();
		$(this).data('virtualParentTracker', vpt);
		vpt.newProperty('virtualParent');
		vpt.newProperty('virtualTransformation', { initial: ID_MATRIX });
		vpt.p([
			'virtualParent',
			'virtualTransformation',
			'virtualParent.positionChange'
		])  ::filter(([vp,vt]) => !!vp && !!vt)
			::map(([vp,vt]) => vp.inside.getTransformToElement($(this).parent()[0]).multiply(vt))
			.subscribe( this::setCTMDirectly );
	}
	vpt.p('virtualParent').next(artefact);
}

export function setCTM(matrix) {
	let vp = $(this).data('virtualParentTracker');
	if (vp) {
		vp.virtualTransformation = matrix;
	} else {
		this::setCTMDirectly(matrix);
	}
}

function setCTMDirectly(matrix) {
	if (!$(this).attr('transform')) {
		$(this).attr('transform', '');
	}
	this.transform.baseVal
		.initialize(refSVG.createSVGTransformFromMatrix(matrix));
}

export function newSVGPoint(x, y) {
	let result = refSVG.createSVGPoint();
	result::assign({x, y});
	return result;
}

export class SVGPoint { // TODO; replace with newSVGPoint
	constructor(x, y) {
		return newSVGPoint(x, y);
	}
}

export class Vector2D {
	
	svgPoint;
	context;
	
	constructor(other) {
		if (other instanceof Vector2D) {
			this.svgPoint = other.svgPoint;
		} else {
			this.svgPoint = refSVG.createSVGPoint();
			this.svgPoint::assign(other::pick('x', 'y'));
		}
		this.context = other.context;
	}
	
	static fromMatrixTranslation(m, context) {
		return new Vector2D({ x: m[tX], y: m[tY], context });
	}
	
	in(context) {
		assert(!!this.context, humanMsg`
			Expecting Point instance to have a context.
		`);
		context = context.context || context;
		if (this.context === context) { return this }
		let coords = this.svgPoint.matrixTransform(this.context.getTransformToElement(context));
		return new Vector2D({
			x: coords.x,
			y: coords.y,
			context
		});
	}
	
	get x () { return this.svgPoint.x  }
	get y () { return this.svgPoint.y  }
	get xy() { return [this.x, this.y] }
	
	plus(other) {
		if (this.context && other.context) {
			other = other.in(this.context);
		}
		return new Vector2D({
			x:       this.x       +  other.x,
			y:       this.y       +  other.y,
			context: this.context || other.context
		});
	}
	
	minus(other) {
		assert(this.context || !other.context, humanMsg`
			A context on the right side of 'Vector2D#minus'
			requires a context on the left.
		`);
		if (other.context) {
			other = other.in(this.context);
		}
		return new Vector2D({
			x:       this.x - other.x,
			y:       this.y - other.y,
			context: other.context ? null : this.context
		});
	}
	
	times(scalar) {
		if (scalar === 1) { return this }
		return new Vector2D({
			x:       this.x * scalar,
			y:       this.y * scalar,
			context: this.context
		});
	}
	
	distanceTo(other) {
		const d = this.minus(other);
		return sqrt(d.x*d.x + d.y*d.y);
	}
	
	partwayTo(factor, other) {
		return this.plus(other).times(factor);
	}
	
	obj(xKey = 'x', yKey = 'y') {
		return {
			[xKey]: this.x,
			[yKey]: this.y
		};
	}
}

export function pagePoint() {
	return new Vector2D({
		x:       this.pageX,
		y:       this.pageY,
		current: document
	});
}

export function scaleFromPoint(factor, point) {
	return this
		.translate( point.x,  point.y)
		.scale(factor)
		.translate(-point.x, -point.y);
}

export function rotateFromVector(dx, dy) {
	if (dy === 0) {
		if (dx > 0) {
			return this;
		} else {
			return this.rotate(180);
		}
	}
	if (dx === 0) {
		if (dy > 0) {
			return this.rotate( 90);
		} else {
			return this.rotate(-90);
		}
	}
	return this.rotateFromVector(dx, dy);
}

export function rotateAround({x, y}, a) {
	return this
		.translate(x, y)
		.rotate(a)
		.translate(-x, -y);
}

export function moveToFront() {
	this.parentElement.appendChild(this);
}

export function snap45(mouseVector, referenceArtefact, referencePoint) {
	let cReferencePoint = referencePoint.in(referenceArtefact.element);
	let mouseVector45 = mouseVector.svgPoint
		.matrixTransform(ID_MATRIX::rotateAround(cReferencePoint, 45));
	mouseVector45 = new Vector2D({ x: mouseVector45.x, y: mouseVector45.y, context: referenceArtefact.element });
	let cDiff = mouseVector.minus(cReferencePoint);
	let cDiff45 = mouseVector45.minus(cReferencePoint);
	const newPt = (xp, yp, m = ID_MATRIX) => new Vector2D({
		...newSVGPoint(xp.x, yp.y).matrixTransform(m)::pick('x', 'y'),
		context: referenceArtefact.element
	});
	mouseVector = [
		{ diff: abs(cDiff.x),   snap: () => newPt(cReferencePoint, mouseVector    ) },
		{ diff: abs(cDiff.y),   snap: () => newPt(mouseVector,     cReferencePoint) },
		{ diff: abs(cDiff45.x), snap: () => newPt(cReferencePoint, mouseVector45,   ID_MATRIX::rotateAround(cReferencePoint, -45)) },
		{ diff: abs(cDiff45.y), snap: () => newPt(mouseVector45,   cReferencePoint, ID_MATRIX::rotateAround(cReferencePoint, -45)) }
	]::minBy('diff').snap();
	return mouseVector;
}
