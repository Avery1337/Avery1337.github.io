// Define constants for grid dimensions
const GRID_ROWS = 40; // A good size to see scarecrow ranges
const GRID_COLS = 40;

// Get references to HTML elements
const farmGridContainer = document.getElementById('farm-grid');
const itemButtons = document.querySelectorAll('.item-buttons button');
const currentSelectionSpan = document.getElementById('current-selection');
// Removed: const clearSelectedButton = document.getElementById('clear-selected-item');
const clearAllButton = document.getElementById('clear-all-items');

// Statistics displays
const totalWateredCountSpan = document.getElementById('total-watered-count');
const wateredProtectedCountSpan = document.getElementById('watered-protected-count');


// Game state variables
let farmGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
let currentItemType = null; // Stores the type of item currently selected for placement

// --- Function to generate the mask (RECOMMENDED FOR COMPLEX SHAPES) ---
function generateDeluxeScarecrowMask() {
    const mask = new Set(); // Use a Set to avoid duplicates and convert to Array at the end

    for (let rOffset = -16; rOffset <= 16; rOffset++) {
        for (let cOffset = -16; cOffset <= 16; cOffset++) {
            const absDx = Math.abs(cOffset); // Absolute horizontal distance from center
            const absDy = Math.abs(rOffset); // Absolute vertical distance from center

            let isCoveredByFormula = false;

            // Rule 1: Overall bounding box (implicit from loop range and absDx/absDy)

            // Rule 2: Specific tapering at the absolute cardinal extremes (to ensure 11-tile width/height)
            if (absDx === 16) {
                if (absDy <= 5) isCoveredByFormula = true;
            } else if (absDy === 16) {
                if (absDx <= 5) isCoveredByFormula = true;
            }
            // Rule 3: General octagonal cut-off for the inner part of the shape
            else if (absDx + absDy <= 22) {
                isCoveredByFormula = true;
            }

            if (isCoveredByFormula) {
                mask.add(`${cOffset},${rOffset}`); // Add the actual offsets (retaining sign)
            }
        }
    }

    // Now, explicitly add the tiles that were specifically mentioned as missing.
    const explicitlyMissingTiles = [
        [9, 14], [10,13], [11, 12], [12, 12], [12, 11], [13, 10], [14, 9], // Top-right quadrant
        [-9, 14], [-10, 13], [-11, 12], [-12, 12], [-12, 11], [-13, 10], [-14, 9], // Top-left quadrant
        [-9, -14], [-10,-13], [-11,-12], [-12,-12], [-12,-11], [-13, -10], [-14,-9], // Bottom-left quadrant
        [9, -14], [10,-13], [11,-12], [12,-12], [12,-11], [13, -10], [14,-9]  // Bottom-right quadrant
    ];

    explicitlyMissingTiles.forEach(tile => {
        mask.add(`${tile[0]},${tile[1]}`); // Add them to the mask set
    });

    // Convert Set of strings back to an array of [dx, dy] arrays
    return Array.from(mask).map(str => str.split(',').map(Number));
}

// Generate the mask once when the script loads
const DELUXE_SCARECROW_MASK_GENERATED = generateDeluxeScarecrowMask();

// --- Initialization ---

// Set up CSS Grid columns based on GRID_COLS
farmGridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;

// Function to create the grid cells dynamically
function createGrid() {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r; // Store row in data attribute
            cell.dataset.col = c; // Store col in data attribute

            // Add left-click listener for placing items
            cell.addEventListener('click', (event) => handleCellLeftClick(r, c, event));

            // Add right-click listener for clearing items
            cell.addEventListener('contextmenu', (event) => handleCellRightClick(r, c, event));

            farmGridContainer.appendChild(cell);
        }
    }
}

// --- Event Handlers ---

function handleCellLeftClick(r, c, event) {
    if (event.button === 0) { // Left-click
        if (currentItemType) {
            farmGrid[r][c] = currentItemType;
        }
    }
    updateFarmVisualsAndCounts();
}

function handleCellRightClick(r, c, event) {
    event.preventDefault(); // Prevent the browser's default context menu

    farmGrid[r][c] = null;
    updateFarmVisualsAndCounts();
}


itemButtons.forEach(button => {
    button.addEventListener('click', () => {
        itemButtons.forEach(btn => btn.classList.remove('selected'));

        const itemType = button.dataset.itemType;
        if (itemType) {
            currentItemType = itemType;
            currentSelectionSpan.textContent = button.textContent; // Update text from button's inner HTML (which is now <img>)
            button.classList.add('selected');
        }
    });
});

// Removed: clearSelectedButton.addEventListener('click', () => {
// Removed:     currentItemType = null;
// Removed:     currentSelectionSpan.textContent = 'None';
// Removed:     itemButtons.forEach(btn => btn.classList.remove('selected'));
// Removed: });

clearAllButton.addEventListener('click', () => {
    farmGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    updateFarmVisualsAndCounts();
    // Also clear current selection when clearing all items
    currentItemType = null;
    currentSelectionSpan.textContent = 'None';
    itemButtons.forEach(btn => btn.classList.remove('selected'));
});

// --- Core Logic: Calculating Ranges and Updating Visuals/Counts ---

function getSprinklerCoverage(sr, sc, type) {
    const coverage = new Set();
    const addTile = (r, c) => {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            coverage.add(`${r},${c}`);
        }
    };

    if (type === 'regular-sprinkler') {
        addTile(sr - 1, sc); // Top
        addTile(sr + 1, sc); // Bottom
        addTile(sr, sc - 1); // Left
        addTile(sr, sc + 1); // Right
    } else if (type === 'quality-sprinkler') {
        for (let rOffset = -1; rOffset <= 1; rOffset++) {
            for (let cOffset = -1; cOffset <= 1; cOffset++) {
                if (rOffset !== 0 || cOffset !== 0) {
                    addTile(sr + rOffset, sc + cOffset);
                }
            }
        }
    } else if (type === 'iridium-sprinkler') {
        for (let rOffset = -2; rOffset <= 2; rOffset++) {
            for (let cOffset = -2; cOffset <= 2; cOffset++) {
                if (rOffset !== 0 || cOffset !== 0) {
                    addTile(sr + rOffset, sc + cOffset);
                }
            }
        }
    }
    return coverage;
}

function isWithinScarecrowRange(dx, dy, type) {
    if (type === 'normal-scarecrow') {
        return dx <= 8 && dy <= 8 && dx + dy <= 11;
    }
    return false;
}


function getScarecrowCoverage(sr, sc, type) {
    const coverage = new Set();
    const addTile = (r, c) => {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            coverage.add(`${r},${c}`);
        }
    };

    if (type === 'normal-scarecrow') {
        const iterateRadius = 8;
        for (let rOffset = -iterateRadius; rOffset <= iterateRadius; rOffset++) {
            for (let cOffset = -iterateRadius; cOffset <= iterateRadius; cOffset++) {
                const dx = Math.abs(rOffset);
                const dy = Math.abs(cOffset);
                if (isWithinScarecrowRange(dx, dy, type)) {
                    addTile(sr + rOffset, sc + cOffset);
                }
            }
        }
    } else if (type === 'deluxe-scarecrow') {
        DELUXE_SCARECROW_MASK_GENERATED.forEach(offset => {
            const [dx, dy] = offset;
            addTile(sr + dy, sc + dx);
        });
    }
    return coverage;
}


function updateFarmVisualsAndCounts() {
    const allCells = farmGridContainer.children;
    for (let i = 0; i < allCells.length; i++) {
        allCells[i].classList.remove(
            'regular-sprinkler', 'quality-sprinkler', 'iridium-sprinkler',
            'normal-scarecrow', 'deluxe-scarecrow',
            'watered-tile', 'protected-tile'
        );
    }

    const allWateredTiles = new Set();
    const allProtectedTiles = new Set();

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const item = farmGrid[r][c];
            const cellElement = allCells[r * GRID_COLS + c];

            if (item) {
                cellElement.classList.add(item);

                if (item.includes('sprinkler')) {
                    const coverage = getSprinklerCoverage(r, c, item);
                    coverage.forEach(tile => {
                        if (tile !== `${r},${c}`) {
                            allWateredTiles.add(tile);
                        }
                    });
                } else if (item.includes('scarecrow')) {
                    const coverage = getScarecrowCoverage(r, c, item);
                    coverage.forEach(tile => {
                        if (tile !== `${r},${c}`) {
                            allProtectedTiles.add(tile);
                        }
                    });
                }
            }
        }
    }

    allWateredTiles.forEach(tileKey => {
        const [r, c] = tileKey.split(',').map(Number);
        const cellElement = allCells[r * GRID_COLS + c];
        const itemAtTile = farmGrid[r][c];

        if (cellElement && (!itemAtTile || (!itemAtTile.includes('sprinkler') && !itemAtTile.includes('scarecrow')))) {
            cellElement.classList.add('watered-tile');
        }
    });

    allProtectedTiles.forEach(tileKey => {
        const [r, c] = tileKey.split(',').map(Number);
        const cellElement = allCells[r * GRID_COLS + c];
        const itemAtTile = farmGrid[r][c];

        if (cellElement && !allWateredTiles.has(tileKey) && (!itemAtTile || (!itemAtTile.includes('sprinkler') && !itemAtTile.includes('scarecrow')))) {
             cellElement.classList.add('protected-tile');
        }
    });

    let actualWateredCount = 0;
    let wateredAndProtectedCount = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const tileKey = `${r},${c}`;
            const itemAtTile = farmGrid[r][c];

            const shouldCountTile = !itemAtTile || (!itemAtTile.includes('scarecrow') && !itemAtTile.includes('sprinkler'));

            if (shouldCountTile) {
                if (allWateredTiles.has(tileKey)) {
                    actualWateredCount++;
                }
                if (allWateredTiles.has(tileKey) && allProtectedTiles.has(tileKey)) {
                    wateredAndProtectedCount++;
                }
            }
        }
    }

    totalWateredCountSpan.textContent = actualWateredCount;
    wateredProtectedCountSpan.textContent = wateredAndProtectedCount;
}

// Initial grid creation when the page loads
createGrid();
updateFarmVisualsAndCounts();
