import LyphRectangle from './artefacts/LyphRectangle';
import './model'; // sets a global (for now)

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {merge} from 'rxjs/observable/merge';

import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {switchMap} from 'rxjs/operator/switchMap';
import {bufferCount} from 'rxjs/operator/bufferCount';

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
import CoalescenceScenarioRectangle from "./artefacts/CoalescenceScenarioRectangle";


import {log} from "./util/rxjs";


let apicalBag = window.module.classes.Lyph.new({
	name: 'Apical Bag',
	layers: [
		window.module.classes.Lyph.new(
	    	{ name: 'Cytosol' },
		    { createRadialBorders: true }
	    ),
		vesselWallA = window.module.classes.Lyph.new(
			{ name: 'Membrane' },
			{ createRadialBorders: true }
		)
	],
	// nodes: [
	// 	node1 = window.module.classes.Node.new()
	// ]
}, { createAxis: true, createRadialBorders: true });



let basolateralBag = window.module.classes.Lyph.new({
	name: 'Basolateral Bag',
	layers: [
		window.module.classes.Lyph.new(
	    	{ name: 'Cytosol' },
		    { createRadialBorders: true }
	    ),
		vesselWallA = window.module.classes.Lyph.new(
			{ name: 'Membrane' },
			{ createRadialBorders: true }
		)
	],
	// nodes: [
	// 	node1 = window.module.classes.Node.new()
	// ]
}, { createAxis: true, createRadialBorders: true });



////////////////////////////////////////////////////////////////////////////////



let vesselWallA, vesselWallB, bloodLayer;//, node1, node2;
let bloodVessel = window.module.classes.Lyph.new({
	name: 'Blood Vessel',
	layers: [
		vesselWallB = window.module.classes.Lyph.new(
	    	{ name: 'Vessel Wall B' },
		    { createRadialBorders: true }
	    ),
		vesselWallA = window.module.classes.Lyph.new(
			{ name: 'Vessel Wall A' },
			{ createRadialBorders: true }
		),
        bloodLayer = window.module.classes.Lyph.new({
            name: 'Blood Layer'
            // parts: [
            // 	window.module.classes.Lyph.new(
            // 		{ name: 'Sublyph' },
            // 		{ createAxis: true, createRadialBorders: true }
            // 	)
            // ]
        }, { createRadialBorders: true })
	],
	// nodes: [
	// 	node1 = window.module.classes.Node.new()
	// ]
}, { createAxis: true, createRadialBorders: true });



let vesselWallA2, vesselWallB2, bloodLayer2;
let bloodVessel2 = window.module.classes.Lyph.new({
	name: 'Blood Vessel 2',
	layers: [
		vesselWallB2 = window.module.classes.Lyph.new(
	    	{ name: 'Vessel Wall B' },
		    { createRadialBorders: true }
	    ),
		vesselWallA2 = window.module.classes.Lyph.new(
			{ name: 'Vessel Wall A' },
			{ createRadialBorders: true }
		),
		bloodLayer2 = window.module.classes.Lyph.new({
			name: 'Blood Layer 2'
			// parts: [
			// 	window.module.classes.Lyph.new(
			// 		{ name: 'Sublyph 2' },
			// 		{ createAxis: true, createRadialBorders: true }
			// 	)
			// ]
		}, { createRadialBorders: true })
	]
}, { createAxis: true, createRadialBorders: true });


let coalescence = window.module.classes.CoalescenceScenario.new({
	lyphs: [
		bloodVessel,
		bloodVessel2
	]
});










// let brain = window.module.classes.Lyph.new({
// 	name: 'Brain',
// 	// nodes: [
// 	// 	node2 = window.module.classes.Node.new()
// 	// ]
// }, { createAxis: true, createRadialBorders: true });


////////////////////////////////////////////////////////////////////////////////


let root = new Canvas({ element: $('#svg') });

new SelectTool      (root.context);
new DragDropTool    (root.context);
new ResizeTool      (root.context);
new ZoomTool        (root.context);
new PanTool         (root.context);
new BorderToggleTool(root.context);

/* print zoom-level */
root.context.p(
	['zoomExponent', 'zoomFactor'],
	(zExp, zFact) => `Zoom: ${zExp} (${Math.round(zFact*100)}%)`
).subscribe(::($('#info').text));


// /* put a test lyph or two in there */ // TODO: remove; use toolbar to add stuff
// let bloodVesselRectangle = new LyphRectangle({
// 	model:  bloodVessel,
// 	x:      100,
// 	y:      100,
// 	width:  200,
// 	height: 150
// 	// rotation: 45 // TODO: remove when done testing
// });
// bloodVesselRectangle.parent = root;


// let brainRectangle = new LyphRectangle({
// 	model:  brain,
// 	x:      300,
// 	y:      300,
// 	width:  150,
// 	height: 150
// });
// brainRectangle.parent = root;


let coalescenceRectangle = new CoalescenceScenarioRectangle({
	model: coalescence,
	x:      200,
	y:      200,
	width:  400,
	height: 400
});
coalescenceRectangle.parent = root;


let apicalRectangle = new LyphRectangle({
	model:  apicalBag,
	x:      500,
	y:      100,
	width:  150,
	height: 150
});
apicalRectangle.parent = root;


let basolateralRectangle = new LyphRectangle({
	model:  basolateralBag,
	x:      500,
	y:      400,
	width:  150,
	height: 150
});
basolateralRectangle.parent = root;



let node1 = window.module.classes.Node.new();
let node2 = window.module.classes.Node.new();
let node3 = window.module.classes.Node.new();
let node4 = window.module.classes.Node.new();
let node5 = window.module.classes.Node.new();
let node6 = window.module.classes.Node.new();

let nodeg1 = new NodeGlyph({
	x: 10,
	y: 10,
	model: node1
});
nodeg1.parent = root;

let nodeg2 = new NodeGlyph({
	x: 10,
	y: 60,
	model: node2
});
nodeg2.parent = root;

let nodeg3 = new NodeGlyph({
	x: 10,
	y: 110,
	model: node3
});
nodeg3.parent = root;

let nodeg4 = new NodeGlyph({
	x: 600,
	y: 10,
	model: node4
});
nodeg4.parent = root;

let nodeg5 = new NodeGlyph({
	x: 600,
	y: 60,
	model: node5
});
nodeg5.parent = root;

let nodeg6 = new NodeGlyph({
	x: 600,
	y: 110,
	model: node6
});
nodeg6.parent = root;


let processEdgeA = new ProcessLine({
	source: nodeg1,
	target: nodeg2
});
processEdgeA.parent = root;
let processEdgeB = new ProcessLine({
	source: nodeg2,
	target: nodeg3
});
processEdgeB.parent = root;
let processEdgeC = new ProcessLine({
	source: nodeg2,
	target: nodeg5
});
processEdgeC.parent = root;
let processEdgeD = new ProcessLine({
	source: nodeg4,
	target: nodeg5
});
processEdgeD.parent = root;
let processEdgeE = new ProcessLine({
	source: nodeg5,
	target: nodeg6
});
processEdgeE.parent = root;


// merge(
// 	coalescenceRectangle.p('leftLyph'),
// 	coalescenceRectangle.p('rightLyph')
// )::log('(a)')::switchMap(l=>l.layers.e('add'))::log('(b)')::switchMap(l=>l.freeFloatingStuff.e('add'))::log('(c)')::filter(c=>c instanceof NodeGlyph)::log('(d)')::bufferCount(6)
// 	::take(1).subscribe(([node1, node2, node3, node4, node5, node6]) => {
//
// 	console.log(node1, node2, node3, node4, node5, node6);
//
// 	// let processEdge = new ProcessLine({
// 	// 	source: node1,
// 	// 	target: node2
// 	// });
// 	// processEdge.parent = root;
// });


// combineLatest(
// 	bloodVesselRectangle.freeFloatingStuff.e('add')::filter(c=>c instanceof NodeGlyph),
// 	brainRectangle      .freeFloatingStuff.e('add')::filter(c=>c instanceof NodeGlyph)
// )::take(1).subscribe(([node1, node2]) => {
// 	let processEdge = new ProcessLine({
// 		source: node1,
// 		target: node2
// 	});
// 	processEdge.parent = root;
// });
