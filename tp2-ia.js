// TODO : modifier cette valeur avec la clé secrète
var room = "laurent";

var GameEnum = {
    move: {
        up: 1,
        left: 2,
        down: 3,
        right: 4
    },
    directions: [1, 2, 3, 4],
    directionsInverse: [3, 4, 1, 2],
    direction: {
        up: 1,
        left: 2,
        down: 3,
        right: 4
    },
    symbol: {
        player: "&",
        goldBag: "$",
        exit: "S",
        empty: " ",
        brick: "#",
        ladder: "H",
        rope: "-"
    },
};

var gameInfo = { 
    level: 0 
};
 
var solution = { 
    stepIndex: 0,
    steps: []
};
 
var isLadder = function (board, position) {
    return board[position.y][position.x] == GameEnum.symbol.ladder;
};

var isRope = function (board, position) {
    return board[position.y][position.x] == GameEnum.symbol.rope;
};

var isBrick = function (board, position) {
    return board[position.y][position.x] == GameEnum.symbol.brick;
};

var addMove = function (moves, position, direction) {
    return moves.concat({position: position, direction: direction});
}

var isUpMoveValid = function (board, position) {
    return position.y != board.length - 1 // Not on top row
        && isLadder(board, position) // On ladder
        && !isBrick(board, getPositionOfTopCell(position)); // No brick above
};

var isDownMoveValid = function (board, position) {
    return position.y != 0 // Not on bottom row  
        && !isBrick(board, getPositionOfBottomCell(position)); // No brick under position 
};

var isRightMoveValid = function (board, position) {
    var onRightColumn = position.x == board[0].length - 1;
    var brickOnRight = isBrick(board, getPositionOfRightCell(position));

    if (onRightColumn || brickOnRight)
        return false;

    var bottomCellPosition = getPositionOfBottomCell(position);
    var canMoveRight = isLadder(board, position) // On ladder
        || isRope(board, position) // On rope
        || isBrick(board, bottomCellPosition) // Over brick
        || isLadder(board, bottomCellPosition); // Over ladder

    return canMoveRight;
};

var isLeftMoveValid = function (board, position) {  
    var onLeftColumn = position.x == 0;
    var brickOnLeft = isBrick(board, getPositionOfLeftCell(position));

    if (onLeftColumn || brickOnLeft)
        return false;

    var bottomCellPosition = getPositionOfBottomCell(position);
    var canMoveLeft = isLadder(board, position) // On ladder
        || isRope(board, position) // On rope
        || isBrick(board, bottomCellPosition) // Over brick
        || isLadder(board, bottomCellPosition); // Over ladder

    return canMoveLeft;
};

var getPosition = function (y, x) {
    return {x: x, y: y};
};

var getPositionOfTopCell = function (position) {
    return getPosition(position.y + 1, position.x);
};

var getPositionOfBottomCell = function (position) {
    return getPosition(position.y - 1, position.x);
};

var getPositionOfRightCell = function (position) {
    return getPosition(position.y, position.x + 1);
};

var getPositionOfLeftCell = function (position) {
    return getPosition(position.y, position.x - 1);
};

var getNextPosition = function (position, direction) {
    var next = [getPositionOfTopCell, getPositionOfLeftCell, getPositionOfBottomCell, getPositionOfRightCell];
    return next[direction - 1](position);
};

var isDirectionValid = function (board, position, direction) {
    var isValid = [isUpMoveValid, isLeftMoveValid, isDownMoveValid, isRightMoveValid];
    return isValid[direction - 1](board, position);
};

var getDirections = function (board, position) {
    var directions = [];
    GameEnum.directions.forEach(function (direction) {
        if (isDirectionValid(board, position, direction)) {
            directions.push(direction);
        }
    });
    return directions;
};

var makeDirectionMap = function (board) {
    return board.map(function (row, y) {
        return row.map(function (cell, x) {
            return getDirections(board, getPosition(y, x));
        });
    });
};

var getPath = function (directionMap, position, end, forbiddenCells, moves) {
    // Exit reached!
    if (position.y == end.y && position.x == end.x) {
        return moves;
    }

    // We're on a forbidden cell
    if (forbiddenCells
            .filter(cell => cell.y == position.y && cell.x == position.x)
            .length != 0)
        return [];
    
    // Possible choice of directions at current position
    // We filter moves that brings us to an already visited position
    var directions = directionMap[position.y][position.x]
        .filter(direction => {
            var newPosition = getNextPosition(position, direction);
            return moves
                .map(move => move.position)
                .find(move => move.y == newPosition.y && move.x == newPosition.x) === undefined;
        });
    
    // look in all directions to find a path
    var solutions = directions
        .map(function(direction) {
            return getPath(
                directionMap,
                getNextPosition(position, direction), 
                end, 
                forbiddenCells, 
                addMove(moves, position, direction)
            );
        }).filter(function(solution) {
            // Remove empty solutions
            return solution.length != 0;
        });

    // No solutions
    if (solutions.length == 0)
        return [];

    // get best solution
    var bestSolution = solutions.sort(function(sol1, sol2) {
        return sol1.length - sol2.length;
    })[0];

    // return the best solution
    return bestSolution;
};

// Solve directionMap using dynamic programming.
// Could use memorization to optimize function, but not necessary
function solveGame(directionMap, exit, currentPosition, goldBags, goldCollected) {
    // No more gold bags to collect. Go to exit
    if (goldBags.length == 0)
        return getPath(directionMap, currentPosition, exit, goldBags, []);

    var solutions = goldBags
        .map(function(goldBag) {
            var goldCollected2 = goldCollected.concat(goldBag);
            var goldToCollect = getGoldBagsRemaining(goldBags, goldCollected2);

            var solution = getPath(directionMap, currentPosition, goldBag, goldToCollect, []);
            if (solution.length == 0)
                return [];

            var solutionAfter = solveGame(directionMap, exit, goldBag, goldToCollect, goldCollected2);
            if (solutionAfter.length == 0)
                return [];

            return solution.concat(solutionAfter);
        }).filter(function(solution) {
            return solution.length != 0;
        }).sort(function(sol1, sol2) {
            return sol1.length - sol2.length;
        });

    // No solutions
    if (solutions.length == 0)
        return [];

    return solutions[0]; // 0 is the shortest one
}

var getGoldBagsRemaining = function (goldBags, foundGoldBags) {
    return goldBags.filter(function(goldBag) {
        return foundGoldBags.indexOf(goldBag) == -1;
    });
}

/**
 * La fonction start() est appelée au début
 * d'un niveau et reçoit en paramètre la grille
 * initiale sous forme de chaîne de caractères
 *
 * Les symboles sont :
 *   # : brique
 *   & : position initiale du joueur
 *   $ : sac d'or
 *   H : échelle
 *   - : corde
 *   S : sortie
 *   espace vide : rien de spécial sur cette case
 */
function start(map) {
    // increment | reset counters
    gameInfo.level++;
    solution.stepIndex = 0;
    solution.steps = [];

    // Guard for unsupported levels
    if (gameInfo.level > 0) {
        console.log("#".repeat(80));
        console.log("#" + " ".repeat(28) + "Your trial as expired." + " ".repeat(28) + "#");
        console.log("#" + " ".repeat(17) + "The free AI only supports the first 6 levels." + " ".repeat(16) + "#");
        console.log("#" + " ".repeat(14) + "Please buy the full version to enjoy all 8 levels." + " ".repeat(14) + "#");
        console.log("#".repeat(80));
        process.exit();
    }

    var preparedMap = prepareMap(map); 
    var elements = getMapElements(preparedMap); 
    // Removes player from board 
    preparedMap[elements.player.y][elements.player.x] = GameEnum.symbol.empty;

    // Build map of possible direction 
    var directionMap = makeDirectionMap(preparedMap);
    solution.steps = solveGame(directionMap, elements.exit, elements.player, elements.goldBags, []);

    if (solution.steps.length == 0) {
        console.log("Failed to find solution for level " + gameInfo.level);
        process.exit();
    }
}

// Transform the board from a string to an array of array (rows x columns)
// where row 0 is at the bottom and column 0 is on the left 
function prepareMap(map) { 
    return map 
            .replace(/\n$/, "") // Remove trailing \n if it exists 
            .split("\n") 
            .reverse()          // So up is y++ and down y-- (Easier to understand)
            .map(function (line) { 
                return Array.from(line); 
            }); 
} 
 
// get player, exit and gold bags positions 
function getMapElements(map) { 
 
    var emptyAccum = {
        player: {x: 0, y: 0 }, 
        exit: {x: 0, y: 0 }, 
        goldBags : [], 
    }; 
 
    return map.reduce((accum, row, y) => { 
        return row.reduce((accum, elem, x) => { 
            switch (elem) { 
                case GameEnum.symbol.player: 
                    accum.player.x = x; 
                    accum.player.y = y;
                    break; 
 
                case GameEnum.symbol.exit: 
                    accum.exit.x = x; 
                    accum.exit.y = y; 
                    break; 
 
                case GameEnum.symbol.goldBag: 
                    var pos = { 
                        x: x, 
                        y: y 
                    }; 
                    accum.goldBags = accum.goldBags.concat(pos);
                    break; 
            } 
            return accum; 
        }, accum) 
    }, emptyAccum); 
}

/**
 * La fonction `next` est appelée automatiquement à
 * chaque tour et doit retourner un enregistrement
 * de la forme :
 *   {event: ..., direction: ...}
 *
 * Où : - event est un des deux événements "move", pour
 *        se déplacer ou "dig" pour creuser
 *      - direction est une des 4 directions haut/gauche/bas/droite,
 *        représenté par un nombre : 1 pour haut, 2 pour gauche, ...
 *
 * Le paramètre `state` est un enregistrement contenant la position
 * du runner au tour actuel sous la forme :
 *
 *     {runner: {position: {x: ..., y: ...}}}
 */
function next(state) {
    // Create command object
    var direction = +solution.steps[solution.stepIndex].direction;
    var cmd = {event: "move", direction: direction};

    // increment counter
    solution.stepIndex++;

    return cmd;
}

// XXX Important : ne pas modifier ces lignes
module.exports.room = room;
module.exports.start = start;
module.exports.next = next;