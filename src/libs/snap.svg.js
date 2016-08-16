import $    from '../libs/jquery.js';
import Snap from 'snapsvg-cjs';
import 'snap.svg.zpd';

let sharedPaper = new Snap();

$(sharedPaper.node).css({
	display: 'none'
});

export function gElement() {
	return sharedPaper.g();
}

export default Snap;
