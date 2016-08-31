import LyphRectangle from './artefacts/LyphRectangle';
import './model'; // sets a global (for now)

const classes = window.module.classes;

import ValueTracker from './util/ValueTracker';

import assign from 'lodash-bound/assign';

import {combineLatest} from 'rxjs/observable/combineLatest';
import {merge} from 'rxjs/observable/merge';

import {filter} from 'rxjs/operator/filter';
import {take} from 'rxjs/operator/take';
import {switchMap} from 'rxjs/operator/switchMap';
import {bufferCount} from 'rxjs/operator/bufferCount';
import {map} from 'rxjs/operator/map';

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
import DrawingTool from "./tools/DrawingTool";
import MaterialGlyph from "./artefacts/MaterialGlyph";
import MeasurableGlyph from "./artefacts/MeasurableGlyph";
import CausalityArrow from "./artefacts/CausalityArrow";

let C = window.module.classes;

////////////////////////////////////////////////////////////////////////////////

const AXIS    = { createAxis: true, createRadialBorders: true };
const NO_AXIS = { createRadialBorders: true };


let sodium = C.Material.Type.new({
	name: "Sodium",
	definition: C.Material.new({
		name: "Sodium"
	})
});
let water = C.Material.Type.new({
	name: "Water",
	definition: C.Material.new({
		name: "Water"
	})
});


// TODO: had to cheat (make 2 instances of the shared layer)
//     : because left-border/right-border cross over in coalescence
let sharedLayer = C.Lyph.new({
	name: "Basement Membrane"
}, NO_AXIS);


let urinaryPFTU, bloodPFTU;
let coalescence1 = C.CoalescenceScenario.new({
	name: "PCT coalescence",
	lyphs: [
		urinaryPFTU = C.Lyph.new({
			name: "Urinary pFTU",
			layers: [
				C.Lyph.new({
					name:      "Urine",
					materials: [ sodium, water ],
					measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Urine" }) ]
				}, NO_AXIS),
				C.Lyph.new({ name: "Epithelium" }, NO_AXIS),
				sharedLayer
			]
		}, AXIS),
		bloodPFTU = C.Lyph.new({
			name: "Blood pFTU",
			layers: [
				C.Lyph.new({
					name:      "Blood",
					materials: [ sodium, water ],
					measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Blood" }) ]
				}, NO_AXIS),
				C.Lyph.new({ name: "Endothelium" }, NO_AXIS),
				sharedLayer
			]
		}, AXIS)
	]
});


let cytosolLayer = () => C.Lyph.new({
	name: "Cytosol",
	materials: [sodium, water],
	measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Cytosol" }) ]
}, NO_AXIS);
let plasmaMembraneLayer = () => C.Lyph.new({ name: "Plasma Membrane" }, NO_AXIS);
let redBloodCell = C.Lyph.new({
	name: "Red Blood Cell",
	layers: [
		cytosolLayer(),
		plasmaMembraneLayer()
	]
}, AXIS);
let apicalRegionOfEpithelialCell = C.Lyph.new({
	name: "Apical region of Epithelial Cell",
	layers: [
		cytosolLayer(),
		plasmaMembraneLayer()
	]
}, AXIS);
let basolateralRegionOfEpithelialCell = C.Lyph.new({
	name: "Basolateral region of Epithelial Cell",
	layers: [
		cytosolLayer(),
		plasmaMembraneLayer()
	]
}, AXIS);


let wallLayer  = () => C.Lyph.new({ name: "Cytosol", materials: [sodium, water] }, NO_AXIS);
let lumenLayer = () => C.Lyph.new({ name: "Plasma Membrane" }, NO_AXIS);
let G = C.Lyph.new({
	name: "V-Type, Extracellular",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);
let H = C.Lyph.new({
	name: "V-Type, Transmembrane",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);
let I = C.Lyph.new({
	name: "V-Type, Intracellular",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);
let L = C.Lyph.new({
	name: "NBC, Extracellular",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);
let K = C.Lyph.new({
	name: "NBC, Transmembrane",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);
let J = C.Lyph.new({
	name: "NBC, Intracellular",
	layers: [
		wallLayer(),
		lumenLayer()
	]
}, AXIS);

let rateMeasurable = C.Measurable.new({ name: "Sodium flux" });
//A measureable for rate Sodium diffusive flow Cytosol layer of Basolateral region of Epithelial Cell {7b}.

///////////////////////////////////////////////////////////////////////////////

let root = new Canvas({ element: $('#svg') });

new CoalescenceScenarioRectangle({
	parent: root,
	model: coalescence1,
	x: 140,
	y: -60,
	width: 200,
	height: 400,
	rotation: 90
});

let xShift = 280;
let x = 470 - xShift;
function nextX() {
	x += xShift;
	return x;
}
// let yShift = 280;
// let y = 470 - xShift;
// function nextY() {
// 	y += yShift;
// 	return y;
// }

new LyphRectangle({
	parent: root,
	model: urinaryPFTU,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: bloodPFTU,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});


new LyphRectangle({
	parent: root,
	model: redBloodCell,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: apicalRegionOfEpithelialCell,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: basolateralRegionOfEpithelialCell,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: G,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: H,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: I,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: J,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: K,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new LyphRectangle({
	parent: root,
	model: L,
	x: nextX(),
	y: 20,
	width:  200,
	height: 220
});

new MeasurableGlyph({
	parent: root,
	model: rateMeasurable,
	x: nextX(),
	y: 20,
});


////////////////////////////////////////////////////////////////////////////////

// layer thickness still the same
// no uniprot ids,
// no visible names for layers
// no good placement of auto-generated floating things
// no co-highlighting of related materials
// no rate-measurable placement option
// shared layer crosses border natures



// TODO: tooltip info based on selected entity, not simple mouse-hover


root.elementCreated.then(() => {
	/* initialize tools */
	new SelectTool                   (root.context);
	new DragDropTool                 (root.context);
	new ResizeTool                   (root.context);
	new ZoomTool                     (root.context);
	new PanTool                      (root.context);
	new BorderToggleTool             (root.context);
	let drawingTool = new DrawingTool(root.context);
	
	
	/* testing the drawing tool */
	let checkbox = $('#controls input[type="checkbox"]');
	checkbox.change(function ({currentTarget}) {
		drawingTool.model = $(currentTarget).prop('checked')
			? classes.Lyph.new({
				name: 'New Lyph'
			  }, { createRadialBorders: true, createAxis: true })
			: null;
	});
	drawingTool.p('active')::filter(v=>!v).subscribe(() => {
		checkbox.prop('checked', false);
	});
	
	/* print zoom-level */
	root.context.p('zoomFactor')
		::map((zFact) => `Zoom: ${Math.round(zFact*100)}%`
	).subscribe(::($('#info > span').text));
});

/* initiate element creation */
root.element;












//
// let apicalBag = classes.Lyph.new({
// 	name: 'Apical Bag',
// 	layers: [
// 		classes.Lyph.new(
// 	    	{ name: 'Cytosol' },
// 		    { createRadialBorders: true }),
// 		classes.Lyph.new(
// 			{ name: 'Membrane' },
// 			{ createRadialBorders: true })
// 	]
// }, { createAxis: true, createRadialBorders: true });
//
//
// let basolateralBag = classes.Lyph.new({
// 	name: 'Basolateral Bag',
// 	layers: [
// 		classes.Lyph.new(
// 	    	{ name: 'Cytosol' },
// 		    { createRadialBorders: true }),
// 		classes.Lyph.new({
// 			name: 'Membrane',
// 			measurables: [
// 				classes.Measurable.new({
// 					name:    "concentration of water in blood",
// 					quality: 'concentration'
// 				})
// 			]
// 		}, { createRadialBorders: true })
// 	]
// }, { createAxis: true, createRadialBorders: true });
//
// let node1 = classes.Node.new();
// let node2 = classes.Node.new();
//
// let material1 = classes.Material.new({
// 	name: 'Water'
// });
//
// let coalescenceScenario = classes.CoalescenceScenario.new({
// 	name: 'My Coalescence',
// 	lyphs: [
// 		apicalBag,
// 	    basolateralBag
// 	]
// });
//
//
// let measurable1 = classes.Measurable.new({
// 	name:    "concentration of water in blood",
// 	quality: 'concentration'
// });
//
// let measurable2 = classes.Measurable.new({
// 	name:    "concentration of other stuff in blood",
// 	quality: 'concentration'
// });
//
// let causality = classes.Causality.new({
// 	cause: measurable1,
// 	effect: measurable2
// });
//
// ////////////////////////////////////////////////////////////////////////////////
//
//
// let root = new Canvas({ element: $('#svg') });
//
//
// new LyphRectangle({
// 	parent:  root,
// 	model:   apicalBag,
// 	x:       100,
// 	y:       100,
// 	width:   150,
// 	height:  150,
// 	rotation: 45
// });
//
//
// new LyphRectangle({
// 	parent: root,
// 	model:  basolateralBag,
// 	x:      300,
// 	y:      200,
// 	width:  150,
// 	height: 150
// });
//
//
// new CoalescenceScenarioRectangle({
// 	parent: root,
// 	model: coalescenceScenario,
// 	x: 600,
// 	y: 300,
// 	width: 200,
// 	height: 300,
// 	rotation: 90
// });
//
//
// let nodeg1 = new NodeGlyph({
// 	parent: root,
// 	x: 300,
// 	y: 20,
// 	model: node1
// });
//
//
// let nodeg2 = new NodeGlyph({
// 	parent: root,
// 	x: 400,
// 	y: 100,
// 	model: node2
// });
//
//
// let processEdge = new ProcessLine({
// 	parent: root,
// 	source: nodeg1,
// 	target: nodeg2
// });
//
//
// let materialg1 = new MaterialGlyph({
// 	parent: root,
// 	x: 400,
// 	y: 150,
// 	model: material1
// });
//
// let measurableg1 = new MeasurableGlyph({
// 	model: measurable1,
// 	parent: root,
// 	x: 40,
// 	y: 300
// });
//
// let measurableg2 = new MeasurableGlyph({
// 	model: measurable2,
// 	parent: root,
// 	x: 60,
// 	y: 350
// });
//
// let causalityArrow = new CausalityArrow({
// 	cause: measurableg1,
// 	effect: measurableg2,
// 	parent: root,
// 	model: causality
// });
//
//
//
