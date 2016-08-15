import LyphRectangle from './LyphRectangle';
import OPModel       from 'open-physiology-model/dist/open-physiology-model-minimal';
const model = OPModel();

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

import Tool     from './tools/Tool';
import MoveTool from './tools/MoveTool';
import ZoomTool from './tools/ZoomTool';
import PanTool from './tools/PanTool';

import $    from './libs/jquery.js';
import Snap from './libs/snap.svg';

////////////////////////////////////////////////////////////////////////////////

let bloodLayer  = model.classes.Lyph.new({ name: 'Blood Layer' }, { createRadialBorders: true });
let wallLayer   = model.classes.Lyph.new({ name: 'Vessel Wall' }, { createRadialBorders: true });
let bloodVessel = model.classes.Lyph.new({
	name: 'Blood Vessel',
	layers: [
		bloodLayer,
	    wallLayer
	]
}, { createAxis: true, createRadialBorders: true });

////////////////////////////////////////////////////////////////////////////////

const makeRectangle = (x, y, width, height) => new LyphRectangle({
	model: bloodVessel,
	x,
	y,
	width,
	height
});


let root = $('#svg');
let paper = Snap('#svg');

root.css({
	border: 'solid 1px black',
	width:   600,
	height:  600
});

paper.zpd({
	pan:  false,
	zoom: false,
	drag: false
});

let canvas = root.children('g');

canvas
	.append(makeRectangle(100, 100, 200, 150).element)
	.append(makeRectangle(350, 100, 200, 150).element);


let context = new ValueTracker()::assign({ root, paper, canvas });

let tool = new MoveTool(context);
let tool2 = new ZoomTool(context);
let tool3 = new PanTool(context);


/* print zoom-levels */
let zoomStatusLabel = $('<div>').insertAfter(root);
context.p(
	['zoomExponent', 'zoomFactor'], [],
	(zExp, zFact) => `Zoom: ${zExp} (${Math.round(zFact*100)}%)`
).subscribe(::zoomStatusLabel.text);
