import $    from '../libs/jquery.js';
import Snap from 'snapsvg-cjs';
import 'snap.svg.zpd';

let paper = Snap('#svg');

// $(paper.node).css({
// 	display: 'none'
// });

export function gElement() {
	return paper.g();
}

export default Snap;
