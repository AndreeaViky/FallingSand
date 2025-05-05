function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
    for (let j = 0; j < arr[i].length; j++) {
      arr[i][j] = 0;
    }
  }
  return arr;
}

// Camera video și handpose
let capture;
let handVideo;
let cameraStarted = false;
let handposeModel;
let predictions = [];

// Grid
let grid;
let velocityGrid;

// Setări nisip
let w = 5;
let cols, rows;
let hueValue = 200;
let gravity = 0.1;

function withinCols(i) {
  return i >= 0 && i <= cols - 1;
}

function withinRows(j) {
  return j >= 0 && j <= rows - 1;
}

function preload() {
  handposeModel = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(600, 500);
  colorMode(HSB, 360, 255, 255);
  cols = width / w;
  rows = height / w;
  grid = make2DArray(cols, rows);
  velocityGrid = make2DArray(cols, rows);

  select("#cameraContainer").style("display", "none");

  const saveBtn = select("#saveBtn");
  saveBtn.mousePressed(() => {
    saveCanvas("cadru_sand", "png");
  });

  const cameraBtn = select("#cameraBtn");
  cameraBtn.mousePressed(() => {
    if (!cameraStarted) {
      capture = createCapture(VIDEO);
      capture.size(600, 500);
      capture.parent("cameraContainer");
      capture.show();
      select("#cameraContainer").style("display", "block");
      cameraStarted = true;
      cameraBtn.html("Oprește camera");

      // Pornim handpose
      handVideo = createCapture(VIDEO);
      handVideo.size(600, 500);
      handVideo.hide();

      handposeModel.detectStart(handVideo, (res) => (predictions = res));
      cameraStarted = true;
      cameraBtn.html("Pornește camera");
    }
  });
}

function mouseDragged() {}

function draw() {
  background(0);
  let mouseCol = -1;
  let mouseRow = -1;
  if (cameraStarted && predictions.length > 0) {
    let hand = predictions[0];
    let index = hand.index_finger_tip;
    let thumb = hand.thumb_tip;

    // Compute midpoint between index finger and thumb
    let x = (index.x + thumb.x) * 0.5;
    let y = (index.y + thumb.y) * 0.5;

    // Draw only if fingers are close together
    let d = dist(index.x, index.y, thumb.x, thumb.y);

    // Indicator 
    noFill();
    stroke(60, 255, 255); // yellow
    strokeWeight(2);
    ellipse(x, y, 20);

    if (d < 30) {
      mouseCol = floor(index.x / w);
      mouseRow = floor(index.y / w);
    }
  }

  if (mouseIsPressed) {
    mouseCol = floor(mouseX / w);
    mouseRow = floor(mouseY / w);
  }

  if (mouseCol != -1 && mouseRow != -1) {
    let matrix = 5;
    let extent = floor(matrix / 2);
    for (let i = -extent; i <= extent; i++) {
      for (let j = -extent; j <= extent; j++) {
        if (random(1) < 0.75) {
          let col = mouseCol + i;
          let row = mouseRow + j;
          if (withinCols(col) && withinRows(row)) {
            grid[col][row] = hueValue;
            velocityGrid[col][row] = 1;
          }
        }
      }
    }
    hueValue += 0.5;
    if (hueValue > 360) {
      hueValue = 1;
    }
  }

  // Desenează nisipul
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      noStroke();
      if (grid[i][j] > 0) {
        fill(grid[i][j], 255, 255);
        square(i * w, j * w, w);
      }
    }
  }

  let nextGrid = make2DArray(cols, rows);
  let nextVelocityGrid = make2DArray(cols, rows);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      let velocity = velocityGrid[i][j];
      let moved = false;

      if (state > 0) {
        let newPos = int(j + velocity);
        for (let y = newPos; y > j; y--) {
          let below = grid[i][y];
          let dir = random(1) < 0.5 ? -1 : 1;
          let belowA = withinCols(i + dir) ? grid[i + dir][y] : -1;
          let belowB = withinCols(i - dir) ? grid[i - dir][y] : -1;

          if (below === 0) {
            nextGrid[i][y] = state;
            nextVelocityGrid[i][y] = velocity + gravity;
            moved = true;
            break;
          } else if (belowA === 0) {
            nextGrid[i + dir][y] = state;
            nextVelocityGrid[i + dir][y] = velocity + gravity;
            moved = true;
            break;
          } else if (belowB === 0) {
            nextGrid[i - dir][y] = state;
            nextVelocityGrid[i - dir][y] = velocity + gravity;
            moved = true;
            break;
          }
        }
      }

      if (state > 0 && !moved) {
        nextGrid[i][j] = state;
        nextVelocityGrid[i][j] = velocity + gravity;
      }
    }
  }

  grid = nextGrid;
  velocityGrid = nextVelocityGrid;
}
