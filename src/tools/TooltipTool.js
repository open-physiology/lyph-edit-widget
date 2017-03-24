import $ from '../libs/jquery';
import {property} from '../util/ValueTracker';
// TODO: no longer need to import: fromEvent;
// TODO: no longer need to import: of;
// TODO: no longer need to import: combineLatest;
// TODO: make sure we don't need to import: switchMap;
// TODO: make sure we don't need to import: filter;
// TODO: make sure we don't need to import: takeUntil;
// TODO: make sure we don't need to import: withLatestFrom;
// TODO: make sure we don't need to import: take;
// TODO: make sure we don't need to import: map;
// TODO: make sure we don't need to import: concat;

import assign from 'lodash-bound/assign';
import pick from 'lodash-bound/pick';
import isFunction from 'lodash-bound/isFunction';
import defaults from 'lodash-bound/defaults';

import Tool from './Tool';
import {withoutMod} from "../util/misc";
import {stopPropagation} from "../util/misc";
import {shiftedMovementFor, log} from "../util/rxjs";
import {afterMatching} from "../util/rxjs";
import {shiftedMatrixMovementFor} from "../util/rxjs";
import {POINT} from "../util/svg";
// TODO: no longer need to import: never;
// TODO: make sure we don't need to import: ignoreElements;
// TODO: make sure we don't need to import: skipUntil;
// TODO: make sure we don't need to import: delay;
// TODO: make sure we don't need to import: skip;
import {setCTM} from "../util/svg";
import {subscribe_} from "../util/rxjs";
import {tap} from "../util/rxjs";
import Canvas from "../artefacts/Canvas";
import {Vector2D} from "../util/svg";
import {pagePoint} from "../util/svg";


export default class TooltipTool extends Tool {
	
	title    = "";
	content  = "";
	
	@property({ initial: true  }) enabled;
	@property({ initial: false }) shown;
	
	constructor(context) {
		super(context, { events: [] });
		
		const mousemove = this.windowE('mousemove');
		
		$('body').powerTip({
			followMouse: true,
			fadeInTime : 0,
			fadeOutTime: 0,
			offset     : 20,
			manual     : true
		});
		
		this.p(['enabled', 'shown'], (e, s) => e && s).subscribe((visible) => {
			if (visible) {
				this.show();
			} else {
				$.powerTip.hide();
			}
		});
	}
	
	show(title = this.title, content = this.content) {
		if (!this.enabled) { return }
		this.title   = title;
		this.content = content;
		let fullContent = `<b>${title}</b>`;
		if (content && content.length > 0) {
			fullContent += `
				<ul style="margin: 3px 0 0 0; padding: 0 0 0 17px; font-style: italic;">
					${ content.map(e => `<li>${e}</li>`).join('') }
				</ul>
			`;
		}
		$('body').data('powertip', fullContent);
		$('#powerTip').html(fullContent);
		$.powerTip.show($('body')[0]);
		$('#powerTip').css({ pointerEvents: 'none' });
		$(document).off('click.powertip'); // disable annoying feature
		this.shown = true;
	}
	
	hide() {
		this.shown = false;
		$.powerTip.hide();
	}
	
	
}

