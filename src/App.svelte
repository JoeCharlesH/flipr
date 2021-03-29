<svelte:window bind:innerWidth={width} bind:innerHeight={height}/>
<svelte:body on:mousemove={handleMouse}/>

<main style={`position: relative; width: ${w * scale}px; height: ${h * scale}px; z-index: -100000;`} bind:this={book}>
	<doc id="book-shadow" style={`height: 100%; position: absolute; width: ${dropWidth}%; left: ${dropLeft}%; z-index: -100000;`}></doc>
	{#each Array(pages) as _, i}
		<Page
			doc={doc} number={i}
			shadow={!(i == 0 || (i == pages - 1 && (pages - 1) % 2) != 0)}
			shadowColor={color} shadowIntensity={intensity}
			progress={Math.max(Math.min($progress - Math.floor(i * 0.5), 1), 0)}  pageWidth={w * scale * 0.5}
		></Page>
	{/each}
	<div class="noselect" style={`z-index: ${pages + 1}; width: 3.5%; height: 100%; position: absolute; top: 0px; left: 0px;`} on:mousemove={handleMouse} on:mousedown={handleMouse} on:mouseup={handleMouse}></div>
	{#if turning}
	<div class="noselect" style={`z-index: ${pages + 2}; width: 100%; height: 100%; position: absolute; top: 0px; left: 0px;`} on:mousemove={handleMouse} on:mouseleave={handleMouse} on:mouseup={handleMouse}></div>
	{/if}
	<div class="noselect" style={`z-index: ${pages + 1}; width: 3.5%; height: 100%; position: absolute; top: 0px; left: 96.5%;`} on:mousemove={handleMouse} on:mousedown={handleMouse} on:mouseup={handleMouse}></div>
</main>

<script>
	import Page from './Page.svelte';
	import {tweened} from 'svelte/motion';
	import {cubicOut} from 'svelte/easing';

	const params = new URLSearchParams(window.location.search);
	const doc = params.get('doc');
	const ratio = Number.parseFloat(params.get('ratio'));
	const pages = Number.parseInt(params.get('pages'));
	const color = params.get('shadow');
	const intensity = Number.parseFloat(params.get('shadowIntensity'));
	const initialProgress = Math.floor((Number.parseFloat(params.get('page')) || 0) * 0.5);
	const scale = Number.parseFloat(params.get('scale')) || 0.98;
	
	let book;
	
	let speed = 0.1;
	let width; let height;
	let turning = false;
	let turnDir = 0;
	let hovering = false;
	let resetting = false;
	let dropWidth = 50;
	let dropLeft = 50;

	let progress = tweened(initialProgress, {
		easing: cubicOut,
		duration: (from, to) => (turning ? 1 : ((Math.abs(from - to) / speed) * 1000) + 1),
	});
	let current = 0;

	updateShadow(initialProgress);
	progress.subscribe(updateShadow);

	function updateShadow(p) {
		let v = Math.min(p, 1);
		dropWidth = 50 + (Math.max(v - 0.5, 0) * 100);
		dropLeft = 50 - (Math.max(v - 0.5, 0) * 100);
	}

	let prev = {x: 0, y: 0, down: false}
	function handleMouse(e) {
		if (!book) return;

		let r = book.getBoundingClientRect();

		if (e.clientX - r.left < 0) {
			if (prev.x - r.left >= 0) reset();
		}
		else if (e.clientX - r.left > r.width) {
			if (prev.x - r.left <= r.width) reset();
		}
		else if (e.clientY - r.top < 0) {
			if (prev.y - r.top < 0) reset();
		}
		else if (e.clientY - r.top > r.height) {
			if (prev.y - r.top <= r.height) reset();
		}
		else {
			var pX = prev.x;
			var wasDown = prev.down;
			prev = {x: e.clientX, y: e.clientY, down: (e.buttons & 1) == 0 };

			if (wasDown && (e.buttons & 1) == 0) reset();
			else if (!wasDown && (e.buttons & 1) > 0) turn();
			if (pX != e.clientX) move();
		}

		prev = {x: e.clientX, y: e.clientY, down: (e.buttons & 1) > 0 };
	}


	function getX() {
		let r = book.getBoundingClientRect();
		return (prev.x - r.left) / r.width;
	}

	function turn() {
		if (turning) return;
		let x = getX();
		progress.update((p) => {
			if (x > 0.965 && p < Math.floor(pages * 0.5)) {
				turning = true;
				turnDir = -1;
				hovering = false;
			}
			else if (x < 0.035 && p > 0) {
				turning = true;
				turnDir = 1;
				hovering = false;
			}
			return p;
		});
	}

	function move() {
		if (resetting) return;

		let x = getX();
		if (turning) {
			progress.update((p) => {
				if (turnDir < 0) return current + (1 - x);
				else return current - x;
			});
		}
		else {
			hovering = true;
			speed = 0.05;
			progress.update((p) => {
				if (x > 0.965 && p < Math.floor(pages * 0.5)) {
					return current + (1 - x);
				}
				else if (x < 0.03 && p > 0) return current - x;
				else return Math.round(p);
			});
		}
	}

	function reset() {
		if (resetting) return;
		speed = 2;
		resetting = true;
		progress.update((p) => {
			current = Math.round(p);
			return current;
		}).then(() => { resetting = false; });
		hovering = false;
		turning = false;
	}

	$:w = Math.min(height * (ratio * 2), width);
	$:h = Math.min(width / (ratio * 2) , height);
</script>

<style>
	.noselect {
		-webkit-touch-callout: none; /* iOS Safari */
			-webkit-user-select: none; /* Safari */
			-khtml-user-select: none; /* Konqueror HTML */
				-moz-user-select: none; /* Old versions of Firefox */
					-ms-user-select: none; /* Internet Explorer/Edge */
							user-select: none; /* Non-prefixed version, currently
																		supported by Chrome, Edge, Opera and Firefox */
	}

	#book-shadow {
		-webkit-box-shadow: 5px 5px 20px 0px rgba(0,0,0,0.75);
		box-shadow: 5px 5px 20px 0px rgba(0,0,0,0.75);
	}
</style>