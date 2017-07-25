import {assign, merge, cloneDeep, values, isUndefined} from 'lodash-bound';
import {Observable} from '../libs/expect-rxjs.js';

import {ID_MATRIX} from '../util/svg.js';
import {property, flag} from 'utilities';

import {Box} from 'boxer';

const {max} = Math;


/**
 * Representation of a lyph in svg space.
 */
export class LyphBox extends Box {
	
	static AXIS_THICKNESS = 10;
	
	
	// TODO: These are temporary; layers shouldn't work this way
	@property() layerNr;
	@property() layerCount;
	
	
	@property() model;
	
	@flag({ initial: true }) hasAxis;
	
	contentBox;
	
	constructor(options = {}) {
		super({
			...options,
			css: (options.css)::cloneDeep()::merge({
				'&': { 'fill': 'black', 'stroke': 'black' }
			})
		});
		if (options.model) { this.model = options.model }
		
		/* when the model is deleted, this artefact is deleted */
		this.p('model.deleted').filter(v=>!!v).subscribe( this.p('deleted') );
		this.p('deleted').filter(v=>!!v).subscribe(() => { this.model.delete() });
		
		/* other model synchronizations */
		for (let key of ['hasAxis', 'width', 'height', 'transformation', 'layerNr', 'layerCount']) {
			this.p(`model.${key}`).filter(v=>!v::isUndefined()).subscribe( this.p(key) );
			this.p([key, 'model']).filter(([v,m]) => !v::isUndefined() && !!m).subscribe(([value, model]) => { model[key] = value });
		}
	}
	
	registerContext({artefactsById, root}) {
		/* parent synchronization */
		this.p(['parent', 'model'])
		    .map(([p, m]) => {
				// find the closest ancestor artefact that has a model
			    while (p && !p.model && p !== root) { p = p.parent }
			    return [p, m];
		    })
		    .filter(([pm,m]) => !pm::isUndefined() && !!m)
		    .subscribe(([parent, model]) => {
				model.parent = parent && parent.model || null;
			});
		this.p('model.parent')
		    .filter(p => !p::isUndefined())
		    .map(p => p ? artefactsById[p.id] : root)
		    .map((a) => {
			    if (a instanceof LyphBox) { a = a.contentBox }
			    // ^ create more general handler/rule for using a sub-artefact as a container,
			    //   and translating back and forth between conceptual parent and artefact parent
				return a;
		    })
		    .subscribe( this.p('parent') );
	}
	
	postCreate(options = {}) {
		super.postCreate(options);
		
		
		/* create inner box */
		this.contentBox = new Box({
			parent: this,
			css: { '&': { stroke: 'transparent' } }
		});
		
		/* reassign handlers */
		// assign particular responsibilities between outer and inner box
		for (let key of [
			'movable'  , 'rotatable',
			'deletable', 'highlightable'
		]) { this.contentBox.handlers[key]::assign(this.handlers[key]) }
		for (let key of [
			'drawzone', 'dropzone'
		]) { this.handlers[key]::assign(this.contentBox.handlers[key]) }
		this.contentBox.borders.bottom.handlers.movable = this.handlers.movable;
		// deactivate reactivity of contentBox borders and corners
		for (let outline of {
			...this.contentBox.borders,
			...this.contentBox.corners
		}::values()) { outline.handlesActive = false }
		// reassign snap-to-borders to contentBox
		for (let [side, x, y, oppositeSide] of [
			['top',    0, -1, 'bottom'],
			['right', +1,  0, 'left'  ],
			['bottom', 0, +1, 'top'   ],
			['left',  -1,  0, 'right' ]
		]) {
			this.borders[side].handlers.dropzone::assign({
				artefact: this.borders[side],
				after: ({artefact}) => {
					// TODO: note that we're currently pretending the two stuck-together things
					//     : have the same rotational orientation; we don't yet support rotated stuckness
					if (artefact instanceof Box) {
						if (artefact.parent === this.contentBox) { // stuck to parent
							artefact.stuckBorders = {
								...artefact.stuckBorders,
								[side]: {
									box: this.contentBox,
									relation: 'parent',
									side: side,
									x, y // refers to artefact side (= same as parent side)
								}
							};
						} else if (artefact.parent === this.parent) { // stuck to sibling
							artefact.stuckBorders = {
								...artefact.stuckBorders,
								[oppositeSide]: {
									box: this,
									relation: 'sibling',
									side: oppositeSide,
									x: -x, y: -y // refers to artefact side (= opposite to sibling side)
								}
							};
						}
						// TODO: check for certain stuckness constraints
					}
				}
			});
		}
		
		
		/* adapt contentBox position to presence of axis */
		this.p('hasAxis').subscribe((ha) => {
			this.contentBox.transformation =
				ID_MATRIX.translate(0, ha * -LyphBox.AXIS_THICKNESS/2);
		});
		this.p(['width', 'height', 'hasAxis']).subscribe(([pw, ph, ha]) => {
			this.contentBox.width  = pw                              ;
			this.contentBox.height = ph - ha * LyphBox.AXIS_THICKNESS;
		});
		
		/* sync roundedness of top corners with contentBox */
		this.corners.tl.p('rounded').subscribe(this.contentBox.corners.tl.p('rounded'));
		this.corners.tr.p('rounded').subscribe(this.contentBox.corners.tr.p('rounded'));

		/* manifest color */
		this.p('model.color').subscribe((color) => {
			this.contentBox.setCSS({
				'&': { fill: color }
			});
		});
		
		/* when bottom border is stuck, lose the axis */
		this.p('stuckBorders').subscribe((stb) => {
			this.hasAxis = !stb.bottom;
		});
		
		/* when clicking border, toggle open/closed sides */
		Observable.merge(this.borders.left.e('click'), this.corners.tl.e('click')).subscribe(() => {
			this.model.leftSideClosed = !this.model.leftSideClosed;
		});
		Observable.merge(this.borders.right.e('click'), this.corners.tr.e('click')).subscribe(() => {
			this.model.rightSideClosed = !this.model.rightSideClosed;
		});
		
		/* change corner rounding based on open/closed sides */
		this.p('model.leftSideClosed') .subscribe(this.corners.tl.p('rounded'));
		this.p('model.rightSideClosed').subscribe(this.corners.tr.p('rounded'));
		
		/* set min-size taking axis and layers into account */
		const noAxisMinHeight = this.minHeight;
		this.p(['hasAxis', 'layerCount'])
		    .map(([ha, lc]) => max(1, lc) * noAxisMinHeight + ha * LyphBox.AXIS_THICKNESS)
		    .subscribe( this.p('minHeight') );
		
		/* if this is a layer, remove the axis */
		this.p(['layerNr', 'parent', 'parent.parent.layerCount'])
		    .filter(([,p]) => p instanceof Box)
		    .subscribe(([layerNr, parent, plc]) => {
				const isLayer = !layerNr::isUndefined();
			    this.hasAxis = !isLayer;
			    if (isLayer) {
				    for (let key of ['movable', 'rotatable', 'deletable']) {
					    this.contentBox.handlers[key]::assign(parent.handlers[key]);
	                    this.handlers[key]::assign(parent.handlers[key]);
				    }
				    for (let outline of {
			            ...this.borders,
			            ...this.corners
			        }::values()) { outline.handlesActive = false }
			        if (layerNr !== 0) {
				        this.corners.bl.svg.main.css({ opacity: 0 });
				        this.corners.br.svg.main.css({ opacity: 0 });
			        }
			    }
		    });
		
		/* if this is a layer, mirror open/closed of parent */
		this.p(['layerNr', 'parent.parent.model.leftSideClosed', 'parent.parent.model.rightSideClosed'])
		    .subscribe(([layerNr, lsc, rsc]) => {
				const isLayer = !layerNr::isUndefined();
				if (isLayer) {
					this.model.leftSideClosed  = lsc;
					this.model.rightSideClosed = rsc;
				}
		    });
		
		// /* move layers with parents */
		// this.p(['parent', 'parent.width', 'parent.height', 'layerNr', 'parent.parent.layerCount'])
		//     .filter(([p,,,ln]) => p instanceof Box && !ln::isUndefined())
		//     .subscribe(([p, pw, ph, ln, plc]) => {
		// 		this.width          = pw;
		// 		this.height         = ph / plc;
		// 	    this.transformation = ID_MATRIX.translate(
		// 	    	0,
		// 		    ph/2 - ln * this.height - this.height/2
		// 	    );
		// 	});
		
		/* move layers with parents */
		this.p([
			'parent',
			'parent.width',
			'parent.height',
			'parent.parent?.model.layerDrawProportionSum',
			'model',
		    'model?.drawProportions',
            'model?.drawOffset'
		])
		    .filter(([p,,,ldps,,dp]) => p instanceof Box && !!ldps && !dp::isUndefined())
		    .subscribe(([p, pw, ph, ldps, m, dp, dos]) => {
				this.width          = pw;
				this.height         = ph * dp / ldps;
			    this.transformation = ID_MATRIX.translate(
			    	0,
				    ph * dos / ldps + this.height/2 - ph / 2
			    );
			});
		
		
		
	}
	
}
