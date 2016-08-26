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


////////////////////////////////////////////////////////////////////////////////


let apicalBag = classes.Lyph.new({
	name: 'Apical Bag',
	layers: [
		classes.Lyph.new(
	    	{ name: 'Cytosol' },
		    { createRadialBorders: true }),
		classes.Lyph.new(
			{ name: 'Membrane' },
			{ createRadialBorders: true })
	]
}, { createAxis: true, createRadialBorders: true });


let basolateralBag = classes.Lyph.new({
	name: 'Basolateral Bag',
	layers: [
		classes.Lyph.new(
	    	{ name: 'Cytosol' },
		    { createRadialBorders: true }),
		classes.Lyph.new({
			name: 'Membrane',
			measurables: [
				classes.Measurable.new({
					name:    "concentration of water in blood",
					quality: 'concentration'
				})
			]
		}, { createRadialBorders: true })
	]
}, { createAxis: true, createRadialBorders: true });

let node1 = classes.Node.new();
let node2 = classes.Node.new();


let coalescenceScenario = classes.CoalescenceScenario.new({
	name: 'My Coalescence',
	lyphs: [
		apicalBag,
	    basolateralBag
	]
});


////////////////////////////////////////////////////////////////////////////////


let root = new Canvas({ element: $('#svg') });


new LyphRectangle({
	parent:  root,
	model:   apicalBag,
	x:       100,
	y:       100,
	width:   150,
	height:  150,
	rotation: 45
});


new LyphRectangle({
	parent: root,
	model:  basolateralBag,
	x:      300,
	y:      200,
	width:  150,
	height: 150
});


new CoalescenceScenarioRectangle({
	parent: root,
	model: coalescenceScenario,
	x: 600,
	y: 500,
	width: 150,
	height: 270,
	rotation: 90
});


let nodeg1 = new NodeGlyph({
	parent: root,
	x: 300,
	y: 20,
	model: node1
});


let nodeg2 = new NodeGlyph({
	parent: root,
	x: 400,
	y: 100,
	model: node2
});


let processEdge = new ProcessLine({
	parent: root,
	source: nodeg1,
	target: nodeg2
});



////////////////////////////////////////////////////////////////////////////////


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
	root.context.p(
		['zoomExponent', 'zoomFactor'],
		(zExp, zFact) => `Zoom: ${zExp} (${Math.round(zFact*100)}%)`
	).subscribe(::($('#info > span').text));
});

/* initiate element creation */
root.element;
