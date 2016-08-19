import LyphRectangle from './artefacts/LyphRectangle';
import model from './model';

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

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

////////////////////////////////////////////////////////////////////////////////

let vesselWall, bloodLayer;
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
	]
}, { createAxis: true, createRadialBorders: true });

let brain = model.classes.Lyph.new({
	name: 'Brain'
}, { createAxis: true, createRadialBorders: true });

let node1 = model.classes.Node.new({ locations: [bloodLayer] });
let node2 = model.classes.Node.new({ locations: [brain]      });


////////////////////////////////////////////////////////////////////////////////


let root = new Canvas();

let context = new ValueTracker()::assign({ root });

new SelectTool  (context);
new DragDropTool(context);
new ResizeTool  (context);
new ZoomTool    (context);
new PanTool     (context);

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

// let nodeGlyph1 = new NodeGlyph({
// 	model: node1,
// 	x: 200,
// 	y: 145
// });
// bloodVesselRectangle.nodes.add(nodeGlyph1);
//
// let nodeGlyph2 = new NodeGlyph({
// 	model: node2,
// 	x: 375,
// 	y: 375
// });
// brainRectangle.nodes.add(nodeGlyph2);

let processEdge = new ProcessLine({
	source: [...bloodVesselRectangle.nodes][0],
	target: [...brainRectangle.nodes][0]
});
processEdge.parent = root;
