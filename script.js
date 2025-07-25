// Define constants for grid dimensions
const GRID_ROWS = 40;
const GRID_COLS = 40;

// Get references to HTML elements
const farmGridContainer = document.getElementById('farm-grid');
const itemButtons = document.querySelectorAll('.item-buttons button');
const clearAllButton = document.getElementById('clear-all-items');
const pressureNozzleToggle = document.getElementById('pressure-nozzle-toggle');

// NEW: Profile Management Elements
const profileNameInput = document.getElementById('profile-name-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const loadProfileBtn = document.getElementById('load-profile-btn');
const deleteProfileBtn = document.getElementById('delete-profile-btn');
const profileSelect = document.getElementById('profile-select');


// Statistics displays
const totalWateredCountSpan = document.getElementById('total-watered-count');
const wateredProtectedCountSpan = document.getElementById('watered-protected-count');

// Game state variables
let farmGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
let currentItemType = null;

const SPRINKLER_IMAGE_PATHS = {
    'regular-sprinkler': {
        original: 'assets/regular_sprinkler.png',
        nozzle: 'assets/regular_sprinkler_nozzle.png'
    },
    'quality-sprinkler': {
        original: 'assets/quality_sprinkler.png',
        nozzle: 'assets/quality_sprinkler_nozzle.png'
    },
    'iridium-sprinkler': {
        original: 'assets/iridium_sprinkler.png',
        nozzle: 'assets/iridium_sprinkler_nozzle.png'
    }
};

function generateDeluxeScarecrowMask() {
    const mask = new Set();

    for (let rOffset = -16; rOffset <= 16; rOffset++) {
        for (let cOffset = -16; cOffset <= 16; cOffset++) {
            const absDx = Math.abs(cOffset);
            const absDy = Math.abs(rOffset);

            let isCoveredByFormula = false;

            if (absDx === 16) {
                if (absDy <= 5) isCoveredByFormula = true;
            } else if (absDy === 16) {
                if (absDx <= 5) isCoveredByFormula = true;
            } else if (absDx + absDy <= 22) {
                isCoveredByFormula = true;
            }

            if (isCoveredByFormula) {
                mask.add(`${cOffset},${rOffset}`);
            }
        }
    }

    const explicitlyMissingTiles = [
        [9, 14], [10,13], [11, 12], [12, 12], [12, 11], [13, 10], [14, 9],
        [-9, 14], [-10, 13], [-11, 12], [-12, 12], [-12, 11], [-13, 10], [-14, 9],
        [-9, -14], [-10,-13], [-11,-12], [-12,-12], [-12,-11], [-13, -10], [-14,-9],
        [9, -14], [10,-13], [11,-12], [12,-12], [12,-11], [13, -10], [14,-9]
    ];

    explicitlyMissingTiles.forEach(tile => {
        mask.add(`${tile[0]},${tile[1]}`);
    });

    return Array.from(mask).map(str => str.split(',').map(Number));
}

const DELUXE_SCARECROW_MASK_GENERATED = generateDeluxeScarecrowMask();

// --- Initialization ---

farmGridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;

function createGrid() {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            cell.addEventListener('click', (event) => handleCellLeftClick(r, c, event));
            cell.addEventListener('contextmenu', (event) => handleCellRightClick(r, c, event));

            farmGridContainer.appendChild(cell);
        }
    }
}

// --- Event Handlers ---

function handleCellLeftClick(r, c, event) {
    if (event.button === 0) {
        if (currentItemType) {
            if (currentItemType.includes('sprinkler')) {
                farmGrid[r][c] = {
                    type: currentItemType,
                    hasNozzle: pressureNozzleToggle.checked
                };
            } else {
                farmGrid[r][c] = currentItemType;
            }
        }
    }
    updateFarmVisualsAndCounts();
}

function handleCellRightClick(r, c, event) {
    event.preventDefault();

    farmGrid[r][c] = null;
    updateFarmVisualsAndCounts();
}

itemButtons.forEach(button => {
    button.addEventListener('click', () => {
        itemButtons.forEach(btn => btn.classList.remove('selected'));

        const itemType = button.dataset.itemType;
        if (itemType) {
            currentItemType = itemType;
            button.classList.add('selected');
        }
    });
});

clearAllButton.addEventListener('click', () => {
    farmGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    updateFarmVisualsAndCounts();
    currentItemType = null;
    itemButtons.forEach(btn => btn.classList.remove('selected'));
    pressureNozzleToggle.checked = false;
    updateItemButtonImages();
});

pressureNozzleToggle.addEventListener('change', () => {
    updateItemButtonImages();
});

function updateItemButtonImages() {
    itemButtons.forEach(button => {
        const itemType = button.dataset.itemType;
        const imgElement = button.querySelector('img');

        if (itemType && imgElement && SPRINKLER_IMAGE_PATHS[itemType]) {
            if (pressureNozzleToggle.checked) {
                imgElement.src = SPRINKLER_IMAGE_PATHS[itemType].nozzle;
            } else {
                imgElement.src = SPRINKLER_IMAGE_PATHS[itemType].original;
            }
        }
    });
}

// --- Profile Management Functions ---

// Key for storing profile names in localStorage
const PROFILE_NAMES_KEY = 'stardewFarmPlannerProfiles';

// Function to get all profile names from localStorage
function getProfileNames() {
    const namesString = localStorage.getItem(PROFILE_NAMES_KEY);
    return namesString ? JSON.parse(namesString) : [];
}

// Function to save profile names to localStorage
function saveProfileNames(names) {
    localStorage.setItem(PROFILE_NAMES_KEY, JSON.stringify(names));
}

// Function to populate the profile dropdown
function populateProfileSelect() {
    profileSelect.innerHTML = '<option value="">-- Select Profile --</option>'; // Clear existing options
    const profileNames = getProfileNames();
    profileNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        profileSelect.appendChild(option);
    });
}

// Function to save the current farm layout
function saveProfile() {
    const profileName = profileNameInput.value.trim();
    if (!profileName) {
        alert('Please enter a name for your profile.');
        return;
    }

    const profileNames = getProfileNames();
    if (profileNames.includes(profileName)) {
        if (!confirm(`Profile "${profileName}" already exists. Do you want to overwrite it?`)) {
            return;
        }
    }

    // Save current farm state
    const farmState = {
        grid: farmGrid,
        nozzleToggle: pressureNozzleToggle.checked
    };
    localStorage.setItem(`stardewFarmPlanner_${profileName}`, JSON.stringify(farmState));

    // Update profile names list
    if (!profileNames.includes(profileName)) {
        profileNames.push(profileName);
        saveProfileNames(profileNames.sort()); // Keep names sorted
    }

    populateProfileSelect(); // Refresh dropdown
    profileNameInput.value = ''; // Clear input field
    alert(`Profile "${profileName}" saved successfully!`);
}

// Function to load a selected farm layout
function loadProfile() {
    const profileName = profileSelect.value;
    if (!profileName) {
        alert('Please select a profile to load.');
        return;
    }

    const savedStateString = localStorage.getItem(`stardewFarmPlanner_${profileName}`);
    if (savedStateString) {
        const savedState = JSON.parse(savedStateString);
        farmGrid = savedState.grid; // Load the grid
        pressureNozzleToggle.checked = savedState.nozzleToggle || false; // Restore nozzle toggle, default to false

        // Ensure grid data is deep copied if necessary (though simple JSON.parse handles most cases)
        // For complex objects within the grid (like our sprinkler objects), JSON.parse correctly deserializes them.

        updateFarmVisualsAndCounts(); // Redraw farm
        updateItemButtonImages(); // Update selection images based on loaded nozzle toggle
        
        // Reset current selection in UI for clarity, as loaded grid might not match
        currentItemType = null;
        itemButtons.forEach(btn => btn.classList.remove('selected'));

        alert(`Profile "${profileName}" loaded successfully!`);
    } else {
        alert(`Profile "${profileName}" not found.`);
    }
}

// Function to delete a selected farm layout
function deleteProfile() {
    const profileName = profileSelect.value;
    if (!profileName) {
        alert('Please select a profile to delete.');
        return;
    }

    if (!confirm(`Are you sure you want to delete profile "${profileName}"? This cannot be undone.`)) {
        return;
    }

    localStorage.removeItem(`stardewFarmPlanner_${profileName}`); // Delete profile data

    let profileNames = getProfileNames();
    profileNames = profileNames.filter(name => name !== profileName);
    saveProfileNames(profileNames); // Update list of names

    populateProfileSelect(); // Refresh dropdown
    alert(`Profile "${profileName}" deleted successfully.`);

    // Optionally, clear the grid after deleting the active profile
    if (profileName === profileSelect.value) { // If the deleted one was currently selected in dropdown
        clearAllButton.click(); // Clear the current grid
    }
}


// --- Core Logic: Calculating Ranges and Updating Visuals/Counts ---

function getSprinklerCoverage(sr, sc, type, applyNozzle = false) {
    const coverage = new Set();
    const addTile = (r, c) => {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            coverage.add(`${r},${c}`);
        }
    };

    let baseRadius = 0;
    if (type === 'regular-sprinkler') {
        baseRadius = 1;
    } else if (type === 'quality-sprinkler') {
        baseRadius = 1;
    } else if (type === 'iridium-sprinkler') {
        baseRadius = 2;
    }

    const finalRadius = applyNozzle ? (baseRadius + 1) : baseRadius;

    if (type === 'regular-sprinkler') {
        if (finalRadius === 1) {
            addTile(sr - 1, sc);
            addTile(sr + 1, sc);
            addTile(sr, sc - 1);
            addTile(sr, sc + 1);
        } else if (finalRadius === 2) {
            for (let rOffset = -1; rOffset <= 1; rOffset++) {
                for (let cOffset = -1; cOffset <= 1; cOffset++) {
                    if (rOffset !== 0 || cOffset !== 0) {
                        addTile(sr + rOffset, sc + cOffset);
                    }
                }
            }
        }
    } else {
        for (let rOffset = -finalRadius; rOffset <= finalRadius; rOffset++) {
            for (let cOffset = -finalRadius; cOffset <= finalRadius; cOffset++) {
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
            'watered-tile', 'protected-tile',
            'has-nozzle'
        );
    }

    const allWateredTiles = new Set();
    const allProtectedTiles = new Set();

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let itemData = farmGrid[r][c];
            const cellElement = allCells[r * GRID_COLS + c];

            if (itemData) {
                let itemType;
                let hasNozzle = false;

                if (typeof itemData === 'object' && itemData !== null) {
                    itemType = itemData.type;
                    hasNozzle = itemData.hasNozzle;
                    if (hasNozzle) {
                        cellElement.classList.add('has-nozzle');
                    }
                } else {
                    itemType = itemData;
                }

                cellElement.classList.add(itemType);

                if (itemType.includes('sprinkler')) {
                    const coverage = getSprinklerCoverage(r, c, itemType, hasNozzle);
                    coverage.forEach(tile => {
                        if (tile !== `${r},${c}`) {
                            allWateredTiles.add(tile);
                        }
                    });
                } else if (itemType.includes('scarecrow')) {
                    const coverage = getScarecrowCoverage(r, c, itemType);
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
        const itemAtTileData = farmGrid[r][c];
        let isItemPlacedDirectly = false;
        if (itemAtTileData) {
            if (typeof itemAtTileData === 'object' && itemAtTileData !== null) {
                isItemPlacedDirectly = itemAtTileData.type.includes('sprinkler');
            } else {
                isItemPlacedDirectly = itemAtTileData.includes('scarecrow');
            }
        }

        if (cellElement && !isItemPlacedDirectly) {
            cellElement.classList.add('watered-tile');
        }
    });

    allProtectedTiles.forEach(tileKey => {
        const [r, c] = tileKey.split(',').map(Number);
        const cellElement = allCells[r * GRID_COLS + c];
        const itemAtTileData = farmGrid[r][c];
        let isItemPlacedDirectly = false;
        if (itemAtTileData) {
            if (typeof itemAtTileData === 'object' && itemAtTileData !== null) {
                isItemPlacedDirectly = itemAtTileData.type.includes('sprinkler');
            } else {
                isItemPlacedDirectly = itemAtTileData.includes('scarecrow');
            }
        }

        if (cellElement && !allWateredTiles.has(tileKey) && !isItemPlacedDirectly) {
            cellElement.classList.add('protected-tile');
        }
    });

    let actualWateredCount = 0;
    let wateredAndProtectedCount = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const tileKey = `${r},${c}`;
            const itemAtTileData = farmGrid[r][c];

            let isItemPlacedAtTile = false;
            if (itemAtTileData) {
                if (typeof itemAtTileData === 'object' && itemAtTileData !== null) {
                    isItemPlacedAtTile = itemAtTileData.type.includes('sprinkler');
                } else {
                    isItemPlacedAtTile = itemAtTileData.includes('scarecrow');
                }
            }

            const shouldCountTile = !isItemPlacedAtTile;

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
populateProfileSelect(); // NEW: Populate dropdown on load
updateFarmVisualsAndCounts();
updateItemButtonImages(); // Call on load to set initial button image states

// NEW: Event Listeners for Profile Management Buttons
saveProfileBtn.addEventListener('click', saveProfile);
loadProfileBtn.addEventListener('click', loadProfile);
deleteProfileBtn.addEventListener('click', deleteProfile);