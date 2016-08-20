import LyphRectangle from './artefacts/LyphRectangle';
import model from './model';

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

import {combineLatest} from 'rxjs/observable/combineLatest';

import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';

import DragDropTool from './tools/DragDropTool';
import ResizeTool   from './tools/ResizeTool';
import ZoomTool     from './tools/ZoomTool';
import PanTool      from './tools/PanTool';
import SelectTool   from './tools/SelectTool';

import $    from './libs/jquery.js';
import Snap from './libs/snap.svg';
import Canvas from "./artefacts/Canvas";
import NodeGlyph from "./artefacts/NodeGlyph";
import ProcessLine from "./artefacts/ProcessLine";
import BorderToggleTool from "./tools/BorderToggleTool";

////////////////////////////////////////////////////////////////////////////////

let vesselWall, bloodLayer, node1, node2;
let bloodVessel = model.classes.Lyph.new({
	name: 'Blood Vessel',
	layers: [
		vesselWall = model.classes.Lyph.new(
	    	{ name: 'Vessel Wall' },
		    { createRadialBorders: true }
	    ),
		bloodLayer = model.classes.Lyph.new({
			name: 'Blood Layer',
			parts: [
				model.classes.Lyph.new(
					{ name: 'Sublyph' },
					{ createAxis: true, createRadialBorders: true }
				)
			]
		}, { createRadialBorders: true })
	],
	nodes: [
		node1 = model.classes.Node.new()
	]
}, { createAxis: true, createRadialBorders: true });

let brain = model.classes.Lyph.new({
	name: 'Brain',
	nodes: [
		node2 = model.classes.Node.new()
	]
}, { createAxis: true, createRadialBorders: true });


////////////////////////////////////////////////////////////////////////////////


let root = new Canvas();

let context = new ValueTracker()::assign({ root });

new SelectTool  (context);
new DragDropTool(context);
new ResizeTool  (context);
new ZoomTool    (context);
new PanTool     (context);
new BorderToggleTool(context);

/* print zoom-level */
context.p(
	['zoomExponent', 'zoomFactor'],
	(zExp, zFact) => `Zoom: ${zExp} (${Math.round(zFact*100)}%)`
).subscribe(::($('#info').text));

/* put a test lyph in there */ // TODO: remove; use toolbar to add stuff
let bloodVesselRectangle = new LyphRectangle({
	model:  bloodVessel,
	x:      100,
	y:      100,
	width:  200,
	height: 150
});
bloodVesselRectangle.parent = root;

let brainRectangle = new LyphRectangle({
	model:  brain,
	x:      300,
	y:      300,
	width:  150,
	height: 150
});
brainRectangle.parent = root;


combineLatest(
	bloodVesselRectangle.freeFloatingStuff.e('add')::filter(c=>c instanceof NodeGlyph),
	brainRectangle      .freeFloatingStuff.e('add')::filter(c=>c instanceof NodeGlyph)
)::take(1).subscribe(([node1, node2]) => {
	debugger;
	let processEdge = new ProcessLine({
		source: node1,
		target: node2
	});
	processEdge.parent = root;
});
