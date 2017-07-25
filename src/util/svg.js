import $, {plainDOM} from '../libs/jquery.js';
import {assign, pick, minBy, isUndefined} from 'lodash-bound';

import assert from 'power-assert';

import {humanMsg} from 'utilities';

const {abs, sqrt, atan2, PI} = Math;

/* constants to use as keys to get matrix values */
export const M11 = 'a';
export const M12 = 'c';
export const M21 = 'b';
export const M22 = 'd';
export const MX  = 'e';
export const MY  = 'f';

/* functions to use like: matrix::m11() or matrix::m11(newValue) */
//
//  [ m11 m12 mx ]
//  [ m21 m22 my ]
//
export function m11(v) { if (!v::isUndefined()) { this[M11] = v } return this[M11] }
export function m12(v) { if (!v::isUndefined()) { this[M12] = v } return this[M12] }
export function m21(v) { if (!v::isUndefined()) { this[M21] = v } return this[M21] }
export function m22(v) { if (!v::isUndefined()) { this[M22] = v } return this[M22] }
export function mx (v) { if (!v::isUndefined()) { this[MX]  = v } return this[MX]  }
export function my (v) { if (!v::isUndefined()) { this[MY]  = v } return this[MY]  }

export const refSVG    = document.createElementNS("http://www.w3.org/2000/svg", "svg");
export const ID_MATRIX = refSVG.createSVGMatrix();
export const ID_POINT  = refSVG.createSVGPoint();
export const SVGMatrix = ID_MATRIX.constructor;
export const SVGPoint  = ID_POINT.constructor;

export function createSVGMatrix(a, b, c, d, e, f) {
	let result = refSVG.createSVGMatrix();
	result::assign({a, b, c, d, e, f});
	return result;
}

export function matrixEquals(M1, M2) {
	return [M11, M12, M21, M22, MX, MY]
		.every(key => M1[key] === M2[key]);
}

export function setCTM(matrix) {
	if (!$(this)[0].transform) {
		$(this).attr('transform', '');
	}
	assert($(this)[0].transform, `You probably tried to create an svg element outside the svg namespace.`);
	$(this)[0].transform.baseVal
	          .initialize(refSVG.createSVGTransformFromMatrix(matrix));
}

export function getCTM() {
	
	if ($(this)[0].transform && $(this)[0].transform.baseVal && $(this)[0].transform.baseVal.numberOfItems) {
		return $(this)[0].transform.baseVal.getItem(0).matrix;
	}
	return ID_MATRIX;
}

export function newSVGPoint(x, y) {
	let result = refSVG.createSVGPoint();
	result::assign({x, y});
	return result;
}


/**
 * A representation of a vector in 2D SVG space.
 */
export class Vector2D {
	
	constructor(other) {
		if (other instanceof Vector2D) {
			this.svgPoint = other.svgPoint;
		} else {
			this.svgPoint = refSVG.createSVGPoint();
			this.svgPoint::assign(other::pick('x', 'y'));
		}
	}
	
	/**
	 * Create a new vector from the translation component of a matrix.
	 * @param {SVGMatrix} m - the matrix from which to take the translation
	 * @returns {Vector2D}  - the new vector
	 */
	static fromMatrixTranslation(m) {
		return new this({ x: m::mx(), y: m::my() });
	}
	
	/**
	 * The raw SVGPoint instance.
	 * @readonly
	 */
	svgPoint;
	
	get x (): number                { return this.svgPoint.x  }
	get y (): number                { return this.svgPoint.y  }
	get xy(): Array<number, number> { return [this.x, this.y] }
	
	/**
	 * Add this vector to another vector.
	 * Does not modify this vector, but returns a new one.
	 * @param   {Vector2D} other - the other vector
	 * @returns {Vector2D}       - the pointwise addition of both vectors
	 */
	plus(other: Vector2D): Vector2D {
		return new Vector2D({
			x: this.x + other.x,
			y: this.y + other.y
		});
	}
	
	/**
	 * Subtract another vector from this one.
	 * Does not modify this vector, but returns a new one.
	 * @param   {Vector2D} other - the other vector
	 * @returns {Vector2D}       - the pointwise subtraction of both vectors
	 */
	minus(other: Vector2D): Vector2D {
		return new Vector2D({
			x: this.x - other.x,
			y: this.y - other.y,
		});
	}
	
	/**
	 * Multiply this vector by a scalar.
	 * Does not modify this vector, but returns a new one.
	 * @param   {number} scalar - the scalar
	 * @returns {Vector2D}      - this vector multiplied by a scalar
	 */
	times(scalar: number): Vector2D {
		if (scalar === 1) { return this }
		return new Point2D({
			x: this.x * scalar,
			y: this.y * scalar
		});
	}
	
	/**
	 * Get the angle this vector makes
	 */
	angle(): number {
		const l = this.length;
		return atan2(this.y/l, this.x/l) * 180 / PI;
	}

	get length(): number {
		return sqrt(this.x*this.x + this.y*this.y);
	}
	
}


/**
 * This represents a point in 2D SVG space. It is aware of its x and y coordinates and of its local coordinate system.
 */
export class Point2D extends Vector2D {
	
	constructor(other) {
		super(other);
		// if (!other.coordinateSystem) { other.coordinateSystem = ID_MATRIX }
		this.coordinateSystem = other.coordinateSystem::plainDOM();
	}
	
	/**
	 * The coordinate system of this point.
	 * @readonly
	 */
	coordinateSystem: SVGElement;
	
	/**
	 * Create a new Point2D from the translation component of a matrix.
	 * @param {SVGMatrix} m                - the matrix from which to take the translation
	 * @param {SVGMatrix} coordinateSystem - the coordinate system for this new point
	 * @returns {Point2D}                  - the new point
	 */
	static fromMatrixTranslation(m: SVGMatrix, coordinateSystem: $ | SVGElement) {
		return new this({
			x:                m::mx(),
			y:                m::my(),
			coordinateSystem: coordinateSystem::plainDOM()
		});
	}
	
	
	in(coordinateSystem: $ | SVGElement): Point2D {
		if (this.coordinateSystem === coordinateSystem) { return this }
		let coords = this.svgPoint.matrixTransform(this.coordinateSystem.getScreenCTM().multiply(coordinateSystem::plainDOM().getScreenCTM().inverse()));
		return new Point2D({
			x: coords.x,
			y: coords.y,
			coordinateSystem
		});
	}
	
	obj(xKey: string = 'x', yKey: string = 'y'): Object {
		return {
			[xKey]: this.x,
			[yKey]: this.y
		};
	}
	
	plus(other: Point2D): Point2D {
		other = other.in(this.coordinateSystem);
		return new Point2D({
			x:                this.x + other.x,
			y:                this.y + other.y,
			coordinateSystem: this.coordinateSystem
		});
	}
	
	minus(other: Point2D): Vector2D {
		other = other.in(this.coordinateSystem);
		return new Vector2D({
			x: this.x - other.x,
			y: this.y - other.y
		});
	}
	
	distanceTo(other: Point2D) {
		const d = this.minus(other);
		return sqrt(d.x*d.x + d.y*d.y);
	}
	
	withFactorTo(factor: number, other: Point2D) {
		other = other.in(this.coordinateSystem);
		return new Point2D({
			x:                this.x * factor + other.x * (1 - factor),
			y:                this.y * factor + other.y * (1 - factor),
			coordinateSystem: this.coordinateSystem
		});
	}
	
	withDistanceTo(distance: number, other: Point2D) {
		const length = this.distanceTo(other);
		return this.withFactorTo(distance/length, other);
	}
	
	transformedBy(matrix: SVGMatrix): Point2D {
		let newPoint = this.svgPoint.matrixTransform(matrix);
		return new Point2D({
			x:                newPoint.x,
			y:                newPoint.y,
			coordinateSystem: this.coordinateSystem
		});
	}
}

/**
 * Function to get a point 2D space based on a DOM event.
 * @this    {MouseEvent}
 * @returns {Point2D} a Point2D instance formed from the pageX and pageY of an event
 */
export function pagePoint() {
	return new Point2D({
		x:                this.pageX,
		y:                this.pageY,
		coordinateSystem: document
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

export function rotateAroundPoint({x, y}, a) {
	return this
		.translate(x, y)
		.rotate(a)
		.translate(-x, -y);
}

export function moveToFront() {
	const plainThis = this::plainDOM();
	if (plainThis.parentElement) {
		plainThis.parentElement.appendChild(plainThis);
	}
}

export function snap45(mouseVector, referenceArtefact, referencePoint) {
	let cReferencePoint = referencePoint.in(referenceArtefact.element);
	let mouseVector45 = mouseVector.svgPoint
		.matrixTransform(ID_MATRIX::rotateAroundPoint(cReferencePoint, 45));
	mouseVector45 = new Point2D({ x: mouseVector45.x, y: mouseVector45.y, coordinateSystem: referenceArtefact.element });
	let cDiff = mouseVector.minus(cReferencePoint);
	let cDiff45 = mouseVector45.minus(cReferencePoint);
	const newPt = (xp, yp, m = ID_MATRIX) => new Point2D({
		...newSVGPoint(xp.x, yp.y).matrixTransform(m)::pick('x', 'y'),
		coordinateSystem: referenceArtefact.element
	});
	mouseVector = [
		{ diff: abs(cDiff.x),   snap: () => newPt(cReferencePoint, mouseVector    ) },
		{ diff: abs(cDiff.y),   snap: () => newPt(mouseVector,     cReferencePoint) },
		{ diff: abs(cDiff45.x), snap: () => newPt(cReferencePoint, mouseVector45,   ID_MATRIX::rotateAroundPoint(cReferencePoint, -45)) },
		{ diff: abs(cDiff45.y), snap: () => newPt(mouseVector45,   cReferencePoint, ID_MATRIX::rotateAroundPoint(cReferencePoint, -45)) }
	]::minBy('diff').snap();
	return mouseVector;
}
