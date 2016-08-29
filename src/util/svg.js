import $ from 'jquery';
import {args} from './misc';
import {assign} from 'bound-native-methods';

export const M11 = 'a';
export const M12 = 'c';
export const M21 = 'b';
export const M22 = 'd';
export const tX  = 'e';
export const tY  = 'f';

export const refSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
export const ID_MATRIX = refSVG.createSVGMatrix();
export const createSVGTransformFromMatrix = ::refSVG.createSVGTransformFromMatrix;
export const POINT = refSVG.createSVGPoint();

export function createSVGPoint(x, y) {
	let result = refSVG.createSVGPoint();
	result.x = x;
	result.y = y;
	return result;
}

export function matrixEquals(M1, M2) {
	return ['a', 'b', 'c', 'd', 'e', 'f'].every(key => M1[key] === M2[key]);
}

export function setCTM(matrix) {
	if (!$(this).attr('transform')) {
		$(this).attr('transform', '');
	}
	this.transform.baseVal
	       .initialize(createSVGTransformFromMatrix(matrix));
}

export class Point {
	
	svg = refSVG.createSVGPoint();
	
	constructor(x, y) {
		this.svg::assign({x, y});
	}
	
	get x() { return this.svg.x }
	get y() { return this.svg.y }
	
	matrixTransform(m) {
		return new Point(this.svg.matrixTransform(m));
	}
	
	@args('n?n?o?') init(x, y, point = {x, y}) {
		this.svg::assign(point);
	}
	
}
