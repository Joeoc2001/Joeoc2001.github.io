const MS_PER_LINE_PART = 1000;
const START_HUE = 0;
const SATURATION = "50%";
const LIGHTNESS = "66%";

function Vector2 (x, y) {
	this.x = x;
	this.y = y;

	this.subtract = function (vec) {
		return new Vector2(x - vec.x, y - vec.y);
	};

	this.add = function(vec) {
		return new Vector2(x + vec.x, y + vec.y);
	};

	this.scale = function(s) {
		return new Vector2(x * s, y * s);
	};
}

function LazyList(head, tail) {
	this.head = head;
	this.tail = tail;
}

// Lazy prepend array to a lazy lazy list (A function that generates a lazy list)
function lazyPrepend(array, lllist, index) {
	if (array.length <= index) {
		return lllist();
	} else {
		return new LazyList(array[index], () => {return lazyPrepend(array, lllist, index + 1)});
	}
}

// Replaces all values with the value given by the mapping function, which returns an array
function lazyReplaceAll(mapping, llist) {
	if (llist == null) {
		return null;
	}

	let vals = mapping (llist.head);
	
	let ending = () => lazyReplaceAll(mapping, llist.tail());
	
	return lazyPrepend(vals, ending, 0);
}

function hilbertMapping(x) {
	switch (x) {
		case 'A':
			return ['L','B','F','R','A','F','A','R','F','B','L'];
		case 'B':
			return ['R','A','F','L','B','F','B','L','F','A','R'];
		default:
			return [x];
	}
}

function genLazyInstructions(depth) {
	if (depth <= 1) {
		return new LazyList('A', () => {return null});
	}

	let c1 = genLazyInstructions(depth - 1);
	
	return lazyReplaceAll(hilbertMapping, c1);
}

function getLengthFromDepth(depth) {
	return (1 << (2 * (depth - 1))) - 1;
}

function directionToVector(d, x, y) {
	switch(d) {
		case 0:
			return new Vector2(x, 0);
		case 1:
			return new Vector2(0, y);
		case 2:
			return new Vector2(-x, 0);
		case 3:
			return new Vector2(0, -y);
	}
}

function drawBubble(ctx, point, lineWidth) {
	ctx.lineWidth = lineWidth / 2;
	ctx.beginPath();
	ctx.arc(point.x, point.y, lineWidth / 4, 0, 2*Math.PI);
	ctx.stroke();
}

function setHue(ctx, hue) {
	ctx.strokeStyle = "hsl(" + hue + ", " + SATURATION + ", " + LIGHTNESS + ")";
}

// noinspection JSAnnotator
return (state) => {
	const depth = state.getControls()["depth_slider"].getValue();
	const size = (1 << (depth - 1)) - 1; // The number of steps taken in each axis to fill the space
	const length = getLengthFromDepth(depth); // The number of steps taken total
	const msps = MS_PER_LINE_PART / Math.pow(state.getControls()["speed_slider"].getValue(), 2);
	const ctx = state.getContext();
	const time = state.getTime();
	const lineWidth = (Math.min(state.getSize()[0], state.getSize()[1]) / size) *
		(state.getControls()["thick_slider"].getValue() / 10);

	// Restart code
	if (state.getRestart()) {
		state.fullCurve = genLazyInstructions(depth);
	}

	// Redraw code
	if (state.getDirty()) {
		setHue(ctx, START_HUE);

		state.currentCurve = state.fullCurve;
		state.progress = 0;
		state.direction = 0;

		state.forewardXDistance = (state.getSize()[0] - lineWidth) / size;
		state.forewardYDistance = (state.getSize()[1] - lineWidth) / size;

		state.lastPos = new Vector2(lineWidth / 2, state.getSize()[1] - lineWidth / 2);
		drawBubble(ctx, state.lastPos, lineWidth);
	}

	// Draw until caught up with time
	while (state.progress < time){
		// If we have run out of instructions then we are done
		if (state.currentCurve == null) {
			return true;
		}

		let linePartIndex = Math.floor(state.progress / msps);

		// Set line style
		let hue = START_HUE + 360 * (linePartIndex / length);
		hue %= 360;
		setHue(ctx, hue);

		// Eat instruction
		switch (state.currentCurve.head) {
			case 'A':
			case 'B':
				break;
			case 'L':
				state.direction += 3;
				state.direction %= 4;
				break;
			case 'R':
				state.direction += 1;
				state.direction %= 4;
				break;
			case 'F':
				let progress = Math.min(1, (time - state.progress) / msps);
				let move = directionToVector(state.direction, state.forewardXDistance, state.forewardYDistance).scale(progress);
				let endPoint = state.lastPos.add(move);

				// Draw line to position
				ctx.lineWidth = lineWidth;
				ctx.beginPath();
				ctx.moveTo(state.lastPos.x, state.lastPos.y);
				ctx.lineTo(endPoint.x, endPoint.y);
				ctx.stroke();

				// Check if done
				if (progress < 1) {
					return false;
				}

				// Draw bubble
				drawBubble(ctx, endPoint, lineWidth);

				// Add progress
				state.lastPos = endPoint;
				state.progress += msps;
				break;
		}

		// Progress by 1 step
		state.currentCurve = state.currentCurve.tail();
	}

	return false;
};
