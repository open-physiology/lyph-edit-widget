export default function searchArgs() {
	return new Map(window.location.search.split('&').map(pair => pair.split('=')));
}
