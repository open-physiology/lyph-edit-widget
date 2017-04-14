import $ from '../libs/jquery';
import {property} from '../util/ValueTracker';

import Tool from './Tool';


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
