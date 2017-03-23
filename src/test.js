import LyphRectangle from './artefacts/LyphRectangle';
import './model'; // sets a global (for now)
import ValueTracker from './util/ValueTracker';
import {ID_MATRIX} from './util/svg';

import assign from 'lodash-bound/assign';
import sortBy from 'lodash-bound/sortBy';

import _range from 'lodash/range';

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
import searchArgs from "./util/searchArgs";
import {createMatrix} from "./util/svg";
import RotateTool from "./tools/RotateTool";
import {toPromise} from "rxjs/operator/toPromise";
import TooltipTool from "./tools/TooltipTool";

let C = window.module.classes;

	
const getArguments = searchArgs();


let root = new Canvas({ element: $('#svg') });


if (getArguments.has('preassemble') || getArguments.has('assemble')) {
	//////////////////////////////////////////////////////////////////////////////
	
	console.info('Building parts...');
	
	const AXIS    = { createAxis: true, createRadialBorders: true };
	const NO_AXIS = { createRadialBorders: true };
	
	let natureSetter = (...borderNatures) => function () {
		let borders = [...this.radialBorders];
		borders[0].nature = [borderNatures[0]];
		borders[1].nature = [borderNatures[1]];
		return this;
	};
	let tube = natureSetter('open',   'open'  );
	let bagL = natureSetter('closed', 'open'  );
	let bagR = natureSetter('open',   'closed');
	let cyst = natureSetter('closed', 'closed');
	
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
	
	// TODO: left-border/right-border cross over in coalescence; fix it
	let sharedLayer = C.Lyph.new({ name: "Basement Membrane", ...longitudinalBorders() }, NO_AXIS)::tube();
	
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
						measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Urine" }) ],
						...longitudinalBorders()
					}, NO_AXIS)::tube(),
					C.Lyph.new({ name: "Epithelium", ...longitudinalBorders() }, NO_AXIS)::tube(),
					sharedLayer
				],
				...longitudinalBorder()
			}, AXIS)::tube(),
			bloodPFTU = C.Lyph.new({
				name: "Blood pFTU",
				layers: [
					C.Lyph.new({
						name:      "Blood",
						materials: [ sodium, water ],
						measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Blood" }) ],
						...longitudinalBorders()
					}, NO_AXIS)::tube(),
					C.Lyph.new({ name: "Endothelium", ...longitudinalBorders() }, NO_AXIS)::tube(),
					sharedLayer
				],
				...longitudinalBorder()
			}, AXIS)::tube()
		]
	});
	
	
	let cytosolLayer = (nature) => C.Lyph.new({
		name: "Cytosol",
		materials: [sodium, water],
		measurables: [ C.Measurable.new({ name: "Concentration of Sodium in Cytosol" }) ],
		...longitudinalBorders()
	}, NO_AXIS);
	let plasmaMembraneLayer = () => C.Lyph.new({ name: "Plasma Membrane", ...longitudinalBorders() }, NO_AXIS);
	
	let redBloodCell = C.Lyph.new({
		name: "Red Blood Cell",
		layers: [
			cytosolLayer()::cyst(),
			plasmaMembraneLayer()::cyst()
		],
		...longitudinalBorder()
	}, AXIS)::cyst(); // specified as bag in the e-mail, but surely a cell is a cyst?
	let apicalRegionOfEpithelialCell = C.Lyph.new({
		name: "Apical region of Epithelial Cell",
		layers: [
			cytosolLayer()::bagL(),
			plasmaMembraneLayer()::bagL()
		],
		...longitudinalBorder()
	}, AXIS)::bagL();
	let basolateralRegionOfEpithelialCell = C.Lyph.new({
		name: "Basolateral region of Epithelial Cell",
		layers: [
			cytosolLayer()::bagR(),
			plasmaMembraneLayer()::bagR()
		],
		...longitudinalBorder()
	}, AXIS)::bagR();
	
	
	let wallLayer  = () => C.Lyph.new({ name: "Wall", ...longitudinalBorders()  }, NO_AXIS);
	let lumenLayer = () => C.Lyph.new({ name: "Lumen", ...longitudinalBorders() }, NO_AXIS);
	let Gmodel = C.Lyph.new({
		name: "V-Type, Extracellular (UniProt ID: P15313)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	let Hmodel = C.Lyph.new({
		name: "V-Type, Transmembrane (UniProt ID: P15313)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	let Imodel = C.Lyph.new({
		name: "V-Type, Intracellular (UniProt ID: P15313)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	let Lmodel = C.Lyph.new({
		name: "NBC, Extracellular (UniProt ID: Q9Y6R1)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	let Kmodel = C.Lyph.new({
		name: "NBC, Transmembrane (UniProt ID: Q9Y6R1)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	let Jmodel = C.Lyph.new({
		name: "NBC, Intracellular (UniProt ID: Q9Y6R1)",
		layers: [
			lumenLayer()::tube(),
			wallLayer() ::tube(),
		],
				...longitudinalBorder()
	}, AXIS)::tube();
	
	let rateMeasurable = C.Measurable.new({ name: "Sodium flux" });
	//A measureable for rate Sodium diffusive flow Cytosol layer of Basolateral region of Epithelial Cell {7b}.
	
	
	let nodes = _range(17).map(i => C.Node.new());
	
	let edgeConnections = [
		[ 0,  2],[ 2,  1],
		    [ 2 ,  3],
		    [ 3 ,  4],
		    [ 4 ,  5],
		    [ 5 ,  6],
		    [ 6 ,  7],
		    [ 7 ,  8],
		    [ 8 ,  9],
		    [ 9 , 10],
		    [10 , 11],
		    [11 , 12],
		    [12 , 13],
		    [13 , 14],
		[15, 14],[14, 16]
	];
	let edges = edgeConnections.map(([source, target]) => C.Process.new({
		source: nodes[source],
		target: nodes[target]
	}));
	
	///////////////////////////////////////////////////////////////////////////////
	
	let ABCDE = new CoalescenceScenarioRectangle({
		parent: root,
		model: coalescence1,
		x: 140,
		y: -60,
		width: 200,
		height: 400,
		rotation: 90
	});
	
	let xShift = 260;
	let x = 490 - xShift;
	function nextX() {
		x += xShift;
		return x;
	}
	
	let ABC = new LyphRectangle({
		parent: root,
		model: urinaryPFTU,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let CDE = new LyphRectangle({
		parent: root,
		model: bloodPFTU,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	
	let redBloodCellR = new LyphRectangle({
		parent: root,
		model: redBloodCell,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let O = new LyphRectangle({
		parent: root,
		model: apicalRegionOfEpithelialCell,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let N = new LyphRectangle({
		parent: root,
		model: basolateralRegionOfEpithelialCell,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let G = new LyphRectangle({
		parent: root,
		model: Gmodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let H = new LyphRectangle({
		parent: root,
		model: Hmodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let I = new LyphRectangle({
		parent: root,
		model: Imodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let J = new LyphRectangle({
		parent: root,
		model: Jmodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let K = new LyphRectangle({
		parent: root,
		model: Kmodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let L = new LyphRectangle({
		parent: root,
		model: Lmodel,
		x: nextX(),
		y: 20,
		width:  200,
		height: 220
	});
	
	let rateMeasurableGlyph = new MeasurableGlyph({
		parent: root,
		model: rateMeasurable,
		x: nextX(),
		y: 20,
	});
	
	let nodeX = -270;
	function nextNodeX() {
		nodeX += 100;
		return nodeX;
	}
	let nodeGs = nodes.map(model => new NodeGlyph({
		parent: root,
		model:  model,
		x: nextNodeX(),
		y: 450
	}));
	
	nodeGs[0].transformation = nodeGs[2].transformation.translate(0, -100);
	nodeGs[1].transformation = nodeGs[2].transformation.translate(0, +100);
	
	nodeGs[15].transformation = nodeGs[14].transformation.translate(0, -100);
	nodeGs[16].transformation = nodeGs[14].transformation.translate(0, +100);
	
	let edgeLs = edgeConnections.map(([source, target]) => new ProcessLine({
		parent: root,
		source: nodeGs[source],
		target: nodeGs[target]
	}));
	
	//////////////////////////////////////////////////////////////////////////////
	
	if (getArguments.has('assemble')) {
		setTimeout(() => {
	
			console.info('Assembling parts...');
	
			/* remove coalescence components */
			ABC.element.jq.detach();
			CDE.element.jq.detach();
	
			/* position coalescence scenario */
			ABCDE.width  = 700;
			// ABCDE.height = 3000 + ABCDE.normalLyph.axisThickness + ABCDE.rotatedLyph.axisThickness;
			ABCDE.height = 3000 + 2 * 14; // ABCDE.normalLyph is undefined?
			ABCDE.transformation = createMatrix(0, 1, -1, 0, 3066, 39);
	
			/* get references to the layers of the coalescence */
			let layersABC = [...ABCDE.normalLyph .layers];
			let layersEDC = [...ABCDE.rotatedLyph.layers];
			let C = ABCDE.sharedLayer;
	
			/* set up left bag of composed cyst */
			O.parent = layersABC[1];
			O.element.jq.appendTo(layersABC[1].element.jq.children('.parts'));
			O.width  = 240;
			O.height = 520;
			O.transformation = createMatrix(0, -1, 1, 0, 100, 540);
			let OLayers = [...O.layers];
			OLayers[0].width -= 60;
			OLayers[0].transformation = OLayers[0].transformation.translate(60, 0);
			OLayers[1].bottomBorder.x1 += 60;
	
			/* set up right bag of composed cyst */
			N.parent = layersABC[1];
			N.element.jq.appendTo(layersABC[1].element.jq.children('.parts'));
			N.width  = 240;
			N.height = 520;
			N.transformation = createMatrix(0, -1, 1, 0, 100, 300);
			let NLayers = [...N.layers];
			NLayers[0].width -= 60;
			NLayers[1].bottomBorder.x2 -= 60;
	
			/* set up inner tubes */
			G.parent = layersABC[1];
			G.element.jq.appendTo(layersABC[1].element.jq.children('.parts'));
			G.width  = 60;
			G.height = 100;
			G.transformation = createMatrix(0, -1, 1, 0, 460, 600);
			H.parent = OLayers[1];
			H.element.jq.appendTo(OLayers[1].element.jq.children('.parts'));
			H.width  = 60;
			H.height = 100;
			H.transformation = createMatrix(1, 0, 0, 1, 0, 360);
			I.parent = OLayers[0];
			I.element.jq.appendTo(OLayers[0].element.jq.children('.parts'));
			I.width  = 60;
			I.height = 100;
			I.transformation = createMatrix(1, 0, 0, 1, 0, 107.5);
			/////
			J.parent = NLayers[0];
			J.element.jq.appendTo(NLayers[0].element.jq.children('.parts'));
			J.width  = 60;
			J.height = 100;
			J.transformation = createMatrix(1, 0, 0, 1, 120, 107.5);
			K.parent = NLayers[1];
			K.element.jq.appendTo(NLayers[1].element.jq.children('.parts'));
			K.width  = 60;
			K.height = 100;
			K.transformation = createMatrix(1, 0, 0, 1, 180, 360);
			L.parent = layersABC[1];
			L.element.jq.appendTo(layersABC[1].element.jq.children('.parts'));
			L.width  = 60;
			L.height = 100;
			L.transformation = createMatrix(0, -1, 1, 0, 460, 60);
	
			/* set up red blood cell to look like a material of the blood layer */
			redBloodCellR.parent = layersEDC[0];
			redBloodCellR.element.jq.appendTo(layersEDC[0].element.jq.children('.materials'));
			redBloodCellR.width  = 200;
			redBloodCellR.height = 220;
			redBloodCellR.transformation = createMatrix(0, 0.5, -0.5, 0, 145, 460);
	
			/* set up the process nodes */
			let i = 0;
			function placeNode(parent, m) {
				nodeGs[i].parent = parent;
				nodeGs[i].element.jq.appendTo(parent.element.jq.children('.nodes'));
				nodeGs[i].transformation = createMatrix(...m);
				i++;
			}
			placeNode( layersABC[0], [0, -1, 1, 0, 0,   300]   );
			placeNode( layersABC[0], [0, -1, 1, 0, 700, 300]   );
			placeNode( layersABC[0], [0, -1, 1, 0, 525, 300]   );
			// placeNode( layersABC[0], [0, -1, 1, 0, 525,   0]   );
			placeNode( G,            [1,  0, 0, 1,   0,  65]   );
			placeNode( H,            [1,  0, 0, 1,   0,  65]   );
			placeNode( I,            [1,  0, 0, 1,   0,  65]   );
			placeNode( I,            [1,  0, 0, 1,  60,  65]   );
			////
			placeNode( NLayers[0],   [1,  0, 0, 1,   0, 172.5] );
			////
			placeNode( J,            [1,  0, 0, 1,   0,  65]   );
			placeNode( K,            [1,  0, 0, 1,   0,  65]   );
			placeNode( L,            [1,  0, 0, 1,   0,  65]   );
			placeNode( L           , [1,  0, 0, 1,  60,  65]   );
			placeNode( layersEDC[1], [0, -1, 1, 0, 175,   0]   );
			placeNode( layersEDC[0], [0, -1, 1, 0, 175,   0]   );
			placeNode( layersEDC[0], [0, -1, 1, 0, 175, 300]   );
			placeNode( layersEDC[0], [0, -1, 1, 0, 700, 300]   );
			placeNode( layersEDC[0], [0, -1, 1, 0, 0  , 300]   );
	
			rateMeasurableGlyph.parent = NLayers[0];
			rateMeasurableGlyph.element.jq.appendTo(NLayers[0].element.jq.children('.foreground'));
			rateMeasurableGlyph.transformation = createMatrix(1, 0, 0, 1, 60, 172.5);
	
		}, 2000);
	}
	
	//////////////////////////////////////////////////////////////////////////////
}



// TODO: tooltip info based on selected entity, not simple mouse-hover

//----- OPTIONAL -----
// no rate-measurable placement option
// layer thickness still the same
// no visible names for layers
// no co-highlighting of related materials
// shared layer crosses border natures

function longitudinalBorders() {
	return {
		longitudinalBorders: [
			C.Border.new(),
			C.Border.new()
		]
	};
}
function longitudinalBorder() {
	return {
		longitudinalBorders: [
			C.Border.new()
		]
	};
}

const AXIS    = { createAxis: true, createRadialBorders: true };
const NO_AXIS = { createRadialBorders: true };

let natureSetter = (...borderNatures) => function () {
	let borders = [...this.radialBorders];
	borders[0].nature = [borderNatures[0]];
	borders[1].nature = [borderNatures[1]];
	return this;
};
let tube = natureSetter('open',   'open'  );
let bagL = natureSetter('closed', 'open'  );
let bagR = natureSetter('open',   'closed');
let cyst = natureSetter('closed', 'closed');


root.element.promise.then(() => {
	/* initialize tools */
	let tooltipTool = new TooltipTool(root.context);
	new SelectTool                   (root.context);
	new DragDropTool                 (root.context);
	new ResizeTool                   (root.context);
	new RotateTool                   (root.context);
	new ZoomTool                     (root.context);
	new PanTool                      (root.context);
	new BorderToggleTool             (root.context);
	let drawingTool = new DrawingTool(root.context);
	
	/* toggle tooltips */
	const showTtCheckbox = $('#showTooltips');
	showTtCheckbox.change(() => {
        tooltipTool.enabled = showTtCheckbox.prop('checked');
	});
	tooltipTool.p('enabled').subscribe((e) => {
		showTtCheckbox.prop('checked', e);
	});
	
	/* convenience functions */
	function threeLayers(nature = tube) {
		return {
			layers: [
	            C.Lyph.new({ name: "Layer 3", ...longitudinalBorders() }, NO_AXIS)::nature(),
	            C.Lyph.new({ name: "Layer 2", ...longitudinalBorders() }, NO_AXIS)::nature(),
	            C.Lyph.new({ name: "Layer 1", ...longitudinalBorders() }, NO_AXIS)::nature()
            ]
		};
	}
	
	// /* preload omega tree model */
	// const preloadedEpithelialTree = (() => {
	// 	const lyph1 = C.Lyph.new({ name: "Minor Calyx"                                 , ...threeLayers()     }, AXIS)::tube();
	// 	const lyph2 = C.Lyph.new({ name: "Medullary Collecting Duct", treeParent: lyph1, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph3 = C.Lyph.new({ name: "Cortical Collecting Duct",  treeParent: lyph2, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph4 = C.Lyph.new({ name: "Distal Convoluted Tubule",  treeParent: lyph3, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph5 = C.Lyph.new({ name: "Ascending Thin Limb",       treeParent: lyph4, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph6 = C.Lyph.new({ name: "Ascending Thick Limb",      treeParent: lyph5, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph7 = C.Lyph.new({ name: "Descending Limb",           treeParent: lyph6, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph8 = C.Lyph.new({ name: "Proximal Tubule",           treeParent: lyph7, ...threeLayers()     }, AXIS)::tube();
	// 	const lyph9 = C.Lyph.new({ name: "Bowman's Capsule",          treeParent: lyph8, ...threeLayers(bagR) }, AXIS)::bagR();
	// 	const result = C.OmegaTree.new({
	// 		parts: [lyph1, lyph2, lyph3, lyph4, lyph5, lyph6, lyph7, lyph8, lyph9]
	// 	});
	// 	result.processColor = '#777700';
	// 	return result;
	// })();
	// const preloadedVenousEndothelialTree = (() => {
	// 	const lyph1 = C.Lyph.new({ name: "Stellate Vein"                     , ...threeLayers() }, AXIS)::tube();
	// 	const lyph2 = C.Lyph.new({ name: "Arcuate Vein",    treeParent: lyph1, ...threeLayers() }, AXIS)::tube();
	// 	const lyph3 = C.Lyph.new({ name: "Interlobar Vein", treeParent: lyph2, ...threeLayers() }, AXIS)::tube();
	// 	return C.OmegaTree.new({
	// 		parts: [lyph1, lyph2, lyph3]
	// 	});
	// })();
	// const preloadedArterialEndothelialTree = (() => {
	// 	const lyph1 = C.Lyph.new({ name: "Afferent Artery"                     , ...threeLayers() }, AXIS)::tube();
	// 	const lyph2 = C.Lyph.new({ name: "Arcuate Artery",    treeParent: lyph1, ...threeLayers() }, AXIS)::tube();
	// 	const lyph3 = C.Lyph.new({ name: "Interlobar Artery", treeParent: lyph2, ...threeLayers() }, AXIS)::tube();
	// 	return C.OmegaTree.new({
	// 		parts: [lyph1, lyph2, lyph3]
	// 	});
	// })();
	const preloadedCoalescenceScenario = (() => (sharedLayer => C.CoalescenceScenario.new({
		lyphs: [
			C.Lyph.new({
				name: "Urinary pFTU",
				layers: [
					C.Lyph.new({ name: "Urine", ...longitudinalBorders()      }, NO_AXIS)::tube(),
					C.Lyph.new({ name: "Epithelium", ...longitudinalBorders() }, NO_AXIS)::tube(),
					sharedLayer
				],
						...longitudinalBorder()
			}, AXIS)::tube(),
			C.Lyph.new({
				name: "Blood pFTU",
				layers: [
					C.Lyph.new({ name: "Blood"      , ...longitudinalBorders() }, NO_AXIS)::tube(),
					C.Lyph.new({ name: "Endothelium", ...longitudinalBorders() }, NO_AXIS)::tube(),
					sharedLayer
				],
						...longitudinalBorder()
			}, AXIS)::tube()
		]
	}))( // shared layer
		C.Lyph.new({ name: "Basement Membrane", ...longitudinalBorders() }, NO_AXIS)::tube()
	))();
	
	
	/* testing the drawing tool */
	for (let [cls, label, newModel, matchesModel] of [
		[ C.Lyph, "Epithelial Cell", () => {
			
			let result = C.Lyph.new({
				layers: [
					C.Lyph.new({ name: "Cytosol"        , ...longitudinalBorders() }, NO_AXIS)::cyst(),
					C.Lyph.new({ name: "Plasma Membrane", ...longitudinalBorders() }, NO_AXIS)::cyst()
				],
						...longitudinalBorder()
			}, AXIS)::cyst();
			
			// console.log(result);
			// debugger;
			
			return result;
		
		
		}, mfn => mfn && mfn.class === C.Lyph && mfn.label === "Epithelial Cell"],
		[ C.Lyph, "Kidney Lobus", () => C.Lyph.new({
			layers: [
				C.Lyph.new({ name: "Medulla of Lobus", ...longitudinalBorders() }, NO_AXIS)::bagR(),
				C.Lyph.new({ name: "Cortex of Lobus" , ...longitudinalBorders() }, NO_AXIS)::bagR()
			],
					...longitudinalBorder()
		}, AXIS)::bagR(), mfn => mfn && mfn.class === C.Lyph && mfn.label === "Kidney Lobus"],
        [ C.Process, "Microcirculation", () => C.Process.new({
            conveyingLyph: [C.Lyph.new({ name: "Blood Vessel", layers: [
                C.Lyph.new({ name: "Outer Wall", ...longitudinalBorders() }, NO_AXIS)::tube(),
                C.Lyph.new({ name: "Inner Wall", ...longitudinalBorders() }, NO_AXIS)::tube(),
                C.Lyph.new({ name: "Blood"     , ...longitudinalBorders() }, NO_AXIS)::tube()
            ],
            		...longitudinalBorder()
            }, AXIS)::tube()],
            source:         C.Node.new(),
            target:         C.Node.new()
        }), mfn => mfn && mfn.class === C.Process],
		// [ C.OmegaTree, "Epithelial Tree",           () => preloadedEpithelialTree,           mfn => mfn && mfn.class === C.OmegaTree ],
		// [ C.OmegaTree, "Venous Endothelial Tree",   () => preloadedVenousEndothelialTree,    mfn => mfn && mfn.class === C.OmegaTree ],
		// [ C.OmegaTree, "Arterial Endothelial Tree", () => preloadedArterialEndothelialTree,  mfn => mfn && mfn.class === C.OmegaTree ],
		[ C.CoalescenceScenario, "Coalescence Scenario", () => preloadedCoalescenceScenario, mfn => mfn && mfn.class === C.CoalescenceScenario ]
	]) {
		const checkbox = $(`
			<label title="New ${label}">
				<input type="checkbox"> ${label}
			</label>
		`).appendTo('#controls').children('input');
		checkbox.keydown((e) => { e.preventDefault() });
		checkbox.change(({currentTarget}) => {
			if ($(currentTarget).prop('checked')) {
				let modelFn = () => {
					let model = newModel();
					model.name = label;
					return model;
				};
				modelFn.class = cls;
				modelFn.label = label;
				drawingTool.modelFn = modelFn;
			} else {
				drawingTool.modelFn = null;
			}
		});
		drawingTool.p('modelFn')
			::filter(mfn => !matchesModel(mfn))
			.subscribe(() => { checkbox.prop('checked', false) });
	}
	
	/* print zoom-level */
	root.context.p('zoomFactor')
		::map((zFact) => `Zoom: ${Math.round(zFact*100)}%`
	).subscribe(::($('#info > span').text));
});
