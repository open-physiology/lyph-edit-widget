import LyphRectangle from './artefacts/LyphRectangle';
import OPModel       from 'open-physiology-model/dist/open-physiology-model-minimal';
const model = OPModel();

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

import DragDropTool from './tools/DragDropTool';
import ResizeTool   from './tools/ResizeTool';
import ZoomTool     from './tools/ZoomTool';
import PanTool      from './tools/PanTool';
import SelectTool   from './tools/SelectTool';

import $    from './libs/jquery.js';
import Snap from './libs/snap.svg';

////////////////////////////////////////////////////////////////////////////////

let bloodVessel = model.classes.Lyph.new({
	name: 'Blood Vessel',
	layers: [
	    model.classes.Lyph.new({ name: 'Vessel Wall' }, { createRadialBorders: true }),
		model.classes.Lyph.new({
			name: 'Blood Layer',
			parts: [
				model.classes.Lyph.new({ name: 'Sublyph' }, { createAxis: true, createRadialBorders: true })
			]
		}, { createRadialBorders: true })
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


let root  = $('#svg');
let paper = Snap('#svg');


paper.zpd({
	pan:  false,
	zoom: false,
	drag: false
});

let canvas = root.children('g');

canvas.append($.svg(`<g id="lyphs"></g>`))
      .append($.svg(`<g id="foreground"></g>`));

canvas.children('#lyphs')
	.append(makeRectangle(100, 100, 200, 150).element)
	.append(makeRectangle(500, 100, 200, 300).element);

let context = new ValueTracker()::assign({ root, paper, canvas });

let tools = [
	new SelectTool  (context),
	new DragDropTool(context),
	new ResizeTool  (context),
	new ZoomTool    (context),
	new PanTool     (context)
];

/* print zoom-levels */
let zoomStatusLabel = $('<div>').appendTo('body').css({
	position: 'absolute',
	top:  0,
	left: 0
});
context.p(
	['zoomExponent', 'zoomFactor'],
	(zExp, zFact) => `Zoom: ${zExp} (${Math.round(zFact*100)}%)`
).subscribe(::zoomStatusLabel.text);
