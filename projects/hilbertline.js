class HilbertCurvePart {
	constructor (left, right, forewards, a, b, commands) {
		this.left = left;
		this.right = right;
		this.forewards = forewards;
		this.a = a;
		this.b = b;
		this.commands = commands;
	}
	
	static fromBase (base, partA, partB) {
		let commands = [];
		for (let i = 0; i < base.commands.length; i++) {
			let newInstructions;
		
			let isA = base.commands[i] === base.a;
			let isB = base.commands[i] === base.b;
			if (isA || isB) {
				// Create new instructions to replace old char with
				if (isA) {
					newInstructions = partA.commands;
				} else {
					newInstructions = partB.commands;
				}
			} else {
				newInstructions = [base.commands[i]];
			}
			
			// Check start and end for alternating turns
			if (false && commands.length > 0 &&
			  ((newInstructions[0] === base.left && commands[base.commands.length - 1] === base.right) ||
			   (newInstructions[0] === base.right && commands[base.commands.length - 1] === base.left))) {
				// Crop off ends
				newInstructions = newInstructions.slice(1, newInstructions.length);
				commands.splice(commands.length - 1, 1);
			}
			
			// Splice in
			commands = commands.concat(newInstructions);
		}
		
		return new HilbertCurvePart(base.left, base.right, base.forewards, base.a, base.b, commands);
	}
}

function genCurveInstruction(depth, t1, t2, f) {
	// From Wikipedia:
	// Alphabet : A, B
	// Constants : F R L
	// Axiom : A
	// Production rules:
	// A → L B F R A F A R F B L
	// B → R A F L B F B L F A R
	let startA = [t1, 'B', f, t2, 'A', f, 'A', t2, f, 'B', t1];
	let startB = [t2, 'A', f, t1, 'B', f, 'B', t1, f, 'A', t2];
	let instruction_power_levels = [[new HilbertCurvePart(t1, t2, f, 'A', 'B', startA), new HilbertCurvePart(t1, t2, f, 'A', 'B', startB)]];
	
	// Generate power levels
	let msb = Math.floor(Math.log2(depth));
	for (let loop = 0; loop < msb; loop++) {
		instruction_next_level = [];
		instruction_prev_level = instruction_power_levels[instruction_power_levels.length - 1];
		instruction_power_levels.push(instruction_next_level);
		
		for (let side = 0; side < 2; side++) {
			// Make a new side from the previous sides
			let next_side = HilbertCurvePart.fromBase(instruction_prev_level[side], instruction_prev_level[0], instruction_prev_level[1]);
			
			
			// Copy new side in
			instruction_next_level.push(next_side);
		}
	}
	
	let instructions = new HilbertCurvePart(t1, t2, f, 'A', 'B', ['A']);
	
	let i = 0;
	while (depth >= 1) {
		if (depth % 2 == 1) {
			instructions = HilbertCurvePart.fromBase(instructions, instruction_power_levels[i][0], instruction_power_levels[i][1]);
		}
		
		depth /= 2;
		depth = Math.floor(depth);
		i++;
	}
	
	return instructions.commands;
}

let turn1char = 'R';
let turn2char = 'L';
let forewardchar = 'F';

let order;
let curve;
let hilbertCanvas;
let currentInstruction = -1;
let ticksPerForeward = 1000;
let currentForewardTicks = 0;
let direction = 0; // 0, 1, 2, 3 => N, E, S, W
let prevPos;
let lastDrawnPos;
let nextPos;
let forewardXDistance;
let forewardYDistance;
let hue = 0;

function hilbertLoopFunction(ticks) {
	// If finished return
	if (currentInstruction >= curve.length) {
		return;
	}
	
	currentForewardTicks -= (ticks * 10);
	
	do {
		// Draw line to position
		let currentMoveVector = nextPos.subtract(prevPos);
		let lineCompletePercent = 1 - (currentForewardTicks / ticksPerForeward);
		currentMoveVector = currentMoveVector.scale(Math.min(1, lineCompletePercent));
		let endPoint = prevPos.add(currentMoveVector);
		
		hilbertCanvas.beginPath();
		hilbertCanvas.moveTo(prevPos.x, prevPos.y);
		hilbertCanvas.lineTo(endPoint.x, endPoint.y);
		hilbertCanvas.stroke();
		
		lastDrawnPos = endPoint;
		
		// If line is done get next instruction
		if (currentForewardTicks <= 0) {
			currentInstruction++;
			
			// Ensure current instruction is a move instruction
			while (currentInstruction < curve.length && curve[currentInstruction] != forewardchar) {
				// Consume turns
				if (curve[currentInstruction] == turn1char) {
					direction += 3;
					direction %= 4;
					
				} else if (curve[currentInstruction] == turn2char) {
					direction += 1;
					direction %= 4;
				}
				
				currentInstruction++;
			}
			
			// Set move instruction
			if (currentInstruction < curve.length) {
				currentForewardTicks += ticksPerForeward;
					
				prevPos = nextPos;
				switch(direction) {
					case 0:
						nextPos = new Point(prevPos.x, prevPos.y - forewardYDistance);
						break;
					case 1:
						nextPos = new Point(prevPos.x - forewardXDistance, prevPos.y);
						break;
					case 2:
						nextPos = new Point(prevPos.x, prevPos.y + forewardYDistance);
						break;
					case 3:
						nextPos = new Point(prevPos.x + forewardXDistance, prevPos.y);
						break;
				}
			}
			
			// Set colour
			hue += 120 / (Math.pow(4, order - 1)); // Path segment number scales by about 4 each time
			hue %= 360;
			hilbertCanvas.strokeStyle = "hsl(" + hue + ", 50%, 66%)";
		}
	} while (currentForewardTicks <= 0 && currentInstruction < curve.length);
}

function hilbertInitFunction(canvas, width, height) {
	hilbertCanvas = canvas;
	
	order = 6;
	
	curve = genCurveInstruction(order, turn1char, turn2char, forewardchar);
	let size = (1 << order) - 1; // The number of steps taken in each axis to fill the space
	
	forewardXDistance = width / size;
	forewardYDistance = height / size;
	
	hilbertCanvas.lineWidth = (forewardXDistance + forewardYDistance) / (2 * 2);
	
	prevPos = new Point(hilbertCanvas.lineWidth / 2, height - (hilbertCanvas.lineWidth / 2));
	lastDrawnPos = prevPos;
	nextPos = prevPos;
	
	// Readjust steps to fit line
	forewardXDistance = (width - hilbertCanvas.lineWidth) / size;
	forewardYDistance = (height - hilbertCanvas.lineWidth) / size;
}

class Point {
	constructor (x, y) {
		this.x = x;
		this.y = y;
	}
	
	subtract(point) {
		return new Point(this.x - point.x, this.y - point.y);
	}
	
	add(point) {
		return new Point(this.x + point.x, this.y + point.y);
	}
	
	scale(s) {
		return new Point(this.x * s, this.y * s);
	}
}

// Run functions to hook onto current page
tickFunction = hilbertLoopFunction;
initFunction = hilbertInitFunction;
