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

export class SVGPoint {
	constructor(x, y) {
		let result = refSVG.createSVGPoint();
		result::assign({x, y});
		return result;
	}
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
