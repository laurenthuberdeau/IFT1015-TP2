// TODO : modifier cette valeur avec la clé secrète
let room = "laurent";

// Game constants
const GameEnum = {
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

// Used to know what level is being solved
var levelNumber = 0;

// Global variable storing solution
var solution = {
    stepIndex: 0,
    steps: []
};

///////////////////////////////////////////////////////////////////////////////
//  Helper functions

// Creates position record from x and y
function getPosition(x, y) {
    return {x: x, y: y};
}

// If board.at(position) is a ladder
function isLadder(board, position) {
    return board[position.y][position.x] == GameEnum.symbol.ladder;
}

// If board.at(position) is a rope
function isRope(board, position) {
    return board[position.y][position.x] == GameEnum.symbol.rope;
}

// If board.at(position) is a brick
function isBrick(board, position) {
    return board[position.y][position.x] == GameEnum.symbol.brick;
}

// Find new position after moving in direction from position
function getNextPosition(position, direction) {
    var next = [getPositionOfTopCell, getPositionOfLeftCell, getPositionOfBottomCell, getPositionOfRightCell];
    return next[direction - 1](position);
}

// Find new position after up move
function getPositionOfTopCell(position) {
    return getPosition(position.x, position.y + 1);
}

// Find new position after down move
function getPositionOfBottomCell(position) {
    return getPosition(position.x, position.y - 1);
}

// Find new position after right move
function getPositionOfRightCell(position) {
    return getPosition(position.x + 1, position.y);
}

// Find new position after left move
function getPositionOfLeftCell(position) {
    return getPosition(position.x - 1, position.y);
}

// If position on board allows up move
function isUpMoveValid(board, position) {
    return position.y != board.length - 1 // Not on top row
        && isLadder(board, position) // On ladder
        && !isBrick(board, getPositionOfTopCell(position)); // No brick above
}

// If position on board allows down move
function isDownMoveValid(board, position) {
    return position.y != 0 // Not on bottom row  
        && !isBrick(board, getPositionOfBottomCell(position)); // No brick under position 
}

// If position on board allows right move
function isRightMoveValid(board, position) {
    var onRightColumn = position.x == board[0].length - 1;
    var brickOnRight = isBrick(board, getPositionOfRightCell(position));
    var onBottomRow = position.y == 0;

    if (onRightColumn || brickOnRight || onBottomRow)
        return false;

    var bottomCellPosition = getPositionOfBottomCell(position);
    var canMoveRight = isLadder(board, position)// On ladder
        || isRope(board, position)              // On rope
        || isBrick(board, bottomCellPosition)   // Over brick
        || isLadder(board, bottomCellPosition); // Over ladder

    return canMoveRight;
}

// If position on board allows left move
function isLeftMoveValid(board, position) {  
    var onLeftColumn = position.x == 0;
    var brickOnLeft = isBrick(board, getPositionOfLeftCell(position));
    var onBottomRow = position.y == 0;

    if (onLeftColumn || brickOnLeft || onBottomRow)
        return false;

    var bottomCellPosition = getPositionOfBottomCell(position);
    var canMoveLeft = isLadder(board, position) // On ladder
        || isRope(board, position)              // On rope
        || isBrick(board, bottomCellPosition)   // Over brick
        || isLadder(board, bottomCellPosition); // Over ladder

    return canMoveLeft;
}

///////////////////////////////////////////////////////////////////////////////
//  Direction map

function makeDirectionMap(board) {
    return board.map(function (row, y) {
        return row.map(function (cell, x) {
            return getDirections(board, getPosition(x,y));
        });
    });
}

function getDirections(board, position) {
    var directions = [];
    GameEnum.directions.forEach(function (direction) {
        if (isDirectionValid(board, position, direction)) {
            directions.push(direction);
        }
    });
    return directions;
}

function isDirectionValid(board, position, direction) {
    var isValid = [isUpMoveValid, isLeftMoveValid, isDownMoveValid, isRightMoveValid];
    return isValid[direction - 1](board, position);
}

///////////////////////////////////////////////////////////////////////////////
//  Path finding

function getPath(directionMap, position, end, forbiddenCells, moves) {
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
}

// Concats move made from position and direction to moves
function addMove(moves, position, direction) {
    return moves.concat({position: position, direction: direction});
}

///////////////////////////////////////////////////////////////////////////////
//  Map solving

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

function getGoldBagsRemaining(goldBags, foundGoldBags) {
    return goldBags.filter(function(goldBag) {
        return foundGoldBags.indexOf(goldBag) == -1;
    });
}

///////////////////////////////////////////////////////////////////////////////
//  Presolving

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
 
// Get player, exit and gold bags positions
function getMapElements(map) {

    var emptyAccum = {
        player: undefined,
        exit: undefined,
        goldBags : [],
    };

    return map.reduce((accum, row, y) => { 
        return row.reduce((accum, elem, x) => { 
            switch (elem) { 
                case GameEnum.symbol.player:
                    accum.player = getPosition(x,y);
                    break;
 
                case GameEnum.symbol.exit:
                    accum.exit = getPosition(x,y);
                    break;
 
                case GameEnum.symbol.goldBag: 
                    accum.goldBags = accum.goldBags.concat(getPosition(x,y));
                    break;
            }
            return accum;
        }, accum)
    }, emptyAccum);
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
    levelNumber++;
    solution.stepIndex = 0;
    solution.steps = [];

    // Guard for unsupported levels
    if (levelNumber > 6) {
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
        console.log("Failed to find solution for level " + levelNumber);
        process.exit();
    }
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

///////////////////////////////////////////////////////////////////////////////
//  Testing

var level1String = "   $    $      &   $       S \n#############################";
var level2String = "S       $ $ $      H      \n###################H      \n                   H      \n           &       H      \n##########################";
var level3String = "    H  $    ---------- $    S    \n    H#######         #########   \n    H                            \n    H        $   &               \n#################################";
var level4String = "  $ $$  ------    H       \n#########     ####H       \n                 #H       \n  S              #H   &   \n##########################";
var level5String = "H#######  H               \nH         H#$             \nH         H#              \nH         H#------        \nH      H &H#      $       \nH      H####     #########\nH      H#                 \nH      H#   $           S \n##########################";
var level6String = "                     H######\n  S   H#########H    H#    #\n  ####H         H    H# $ $#\n      H         H    H######\n      H   ------H----H     #\nH#########H     H    H     #\nH         H     H    H     #\nH         H#####H    H     #\n##H###H         H###########\n  H   H         H      #####\n  H   H------   H      # $ #\n####  H     #######H########\n      H            H        \n      H        &   H        \n############################\n";

function tests() {

    const level1String = "   $    $      &   $       S \n#############################";
    const level2String = "S       $ $ $      H      \n###################H      \n                   H      \n           &       H      \n##########################";
    const level3String = "    H  $    ---------- $    S    \n    H#######         #########   \n    H                            \n    H        $   &               \n#################################";
    const level4String = "  $ $$  ------    H       \n#########     ####H       \n                 #H       \n  S              #H   &   \n##########################";

    function getPositionTest() {
        console.assert(getPosition(0,0).x == 0);
        console.assert(getPosition(0,0).y == 0);
        console.assert(getPosition(1,0).x == 1);
        console.assert(getPosition(0,1).y == 1);
        console.assert(getPosition(-1,0).x == -1);
        console.assert(getPosition(0,-1).y == -1);
    }

    function isLadderTest() {
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(0,0)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(1,0)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(2,0)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(0,1)));
        console.assert(isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(1,1)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(2,1)));
        console.assert(isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(0,2)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(1,2)));
        console.assert(!isLadder([[' ', ' ', ' '],[' ', 'H', '#'],['H','-','#']], getPosition(2,2)));
    }

    function isRopeTest() {
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,0)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,0)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,0)));
        console.assert(isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,1)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,1)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,1)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,2)));
        console.assert(isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,2)));
        console.assert(!isRope([[' ', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,2)));
    }

    function isBrickTest() {
        console.assert(isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,0)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,0)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,0)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,1)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,1)));
        console.assert(isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,1)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(0,2)));
        console.assert(!isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(1,2)));
        console.assert(isBrick([['#', ' ', ' '],['-', 'H', '#'],['H','-','#']], getPosition(2,2)));
    }

    function getNextPositionTest() {
        console.assert(getNextPosition(getPosition(0,0), GameEnum.direction.up).x == 0);
        console.assert(getNextPosition(getPosition(0,0), GameEnum.direction.up).y == 1);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.up).x == 5);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.up).y == 4);

        console.assert(getNextPosition(getPosition(0,1), GameEnum.direction.down).x == 0);
        console.assert(getNextPosition(getPosition(0,1), GameEnum.direction.down).y == 0);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.down).x == 5);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.down).y == 2);

        console.assert(getNextPosition(getPosition(1,0), GameEnum.direction.left).x == 0);
        console.assert(getNextPosition(getPosition(1,0), GameEnum.direction.left).y == 0);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.left).x == 4);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.left).y == 3);

        console.assert(getNextPosition(getPosition(0,0), GameEnum.direction.right).x == 1);
        console.assert(getNextPosition(getPosition(0,0), GameEnum.direction.right).y == 0);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.right).x == 6);
        console.assert(getNextPosition(getPosition(5,3), GameEnum.direction.right).y == 3);
    }

    function getPositionOfTopCellTest() {
        console.assert(getPositionOfTopCell(getPosition(2,3)).x == 2);
        console.assert(getPositionOfTopCell(getPosition(2,3)).y == 4);
        console.assert(getPositionOfTopCell(getPosition(1,7)).x == 1);
        console.assert(getPositionOfTopCell(getPosition(1,7)).y == 8);
    }

    function getPositionOfBottomCellTest() {
        console.assert(getPositionOfBottomCell(getPosition(2,3)).x == 2);
        console.assert(getPositionOfBottomCell(getPosition(2,3)).y == 2);
        console.assert(getPositionOfBottomCell(getPosition(1,7)).x == 1);
        console.assert(getPositionOfBottomCell(getPosition(1,7)).y == 6);
    }

    function getPositionOfRightCellTest() {
        console.assert(getPositionOfRightCell(getPosition(2,3)).x == 3);
        console.assert(getPositionOfRightCell(getPosition(2,3)).y == 3);
        console.assert(getPositionOfRightCell(getPosition(1,7)).x == 2);
        console.assert(getPositionOfRightCell(getPosition(1,7)).y == 7);
    }

    function getPositionOfLeftCellTest() {
        console.assert(getPositionOfLeftCell(getPosition(2,3)).x == 1);
        console.assert(getPositionOfLeftCell(getPosition(2,3)).y == 3);
        console.assert(getPositionOfLeftCell(getPosition(1,7)).x == 0);
        console.assert(getPositionOfLeftCell(getPosition(1,7)).y == 7);
    }

    function isUpMoveValidTest() {
        var board = [['#','#','#'], ['H', ' ', ' '],['H', '#', ' '],['H',' ','-']];
        console.assert(isUpMoveValid(board, getPosition(0,1)));
        console.assert(!isUpMoveValid(board, getPosition(1,1)));
        console.assert(!isUpMoveValid(board, getPosition(2,1)));
        console.assert(isUpMoveValid(board, getPosition(0,2)));
        console.assert(!isUpMoveValid(board, getPosition(1,2)));
        console.assert(!isUpMoveValid(board, getPosition(2,2)));
        console.assert(!isUpMoveValid(board, getPosition(0,3)));
        console.assert(!isUpMoveValid(board, getPosition(1,3)));
        console.assert(!isUpMoveValid(board, getPosition(2,3)));
    }

    function isDownMoveValidTest() {
        var board = [['#','#','#'], ['H', ' ', ' '],['H', '#', ' '],['H',' ','-']];
        console.assert(!isDownMoveValid(board, getPosition(0,1)));
        console.assert(!isDownMoveValid(board, getPosition(1,1)));
        console.assert(!isDownMoveValid(board, getPosition(2,1)));
        console.assert(isDownMoveValid(board, getPosition(0,2)));
        console.assert(isDownMoveValid(board, getPosition(1,2)));
        console.assert(isDownMoveValid(board, getPosition(2,2)));
        console.assert(isDownMoveValid(board, getPosition(0,3)));
        console.assert(!isDownMoveValid(board, getPosition(1,3)));
        console.assert(isDownMoveValid(board, getPosition(2,3)));
    }

    function isRightMoveValidTest() {
        var board = [['#','#','#'], ['H', ' ', ' '],['H', '#', ' '],['H',' ','-']];
        console.assert(isRightMoveValid(board, getPosition(0,1)));
        console.assert(isRightMoveValid(board, getPosition(1,1)));
        console.assert(!isRightMoveValid(board, getPosition(2,1)));
        console.assert(!isRightMoveValid(board, getPosition(0,2)));
        console.assert(!isRightMoveValid(board, getPosition(1,2)));
        console.assert(!isRightMoveValid(board, getPosition(2,2)));
        console.assert(isRightMoveValid(board, getPosition(0,3)));
        console.assert(isRightMoveValid(board, getPosition(1,3)));
        console.assert(!isRightMoveValid(board, getPosition(2,3)));
    }

    function isLeftMoveValidTest() {
        var board = [['#','#','#'], ['H', ' ', ' '],['H', '#', ' '],['H',' ','-']];
        console.assert(!isLeftMoveValid(board, getPosition(0,1)));
        console.assert(isLeftMoveValid(board, getPosition(1,1)));
        console.assert(isLeftMoveValid(board, getPosition(2,1)));
        console.assert(!isLeftMoveValid(board, getPosition(0,2)));
        console.assert(!isLeftMoveValid(board, getPosition(1,2)));
        console.assert(!isLeftMoveValid(board, getPosition(2,2)));
        console.assert(!isLeftMoveValid(board, getPosition(0,3)));
        console.assert(isLeftMoveValid(board, getPosition(1,3)));
        console.assert(isLeftMoveValid(board, getPosition(2,3)));
    }

    function makeDirectionMapTest() {
        var board = [['#','#','#'], ['H', ' ', ' '],['H', '#', ' '],['H',' ','-']];
        console.assert(makeDirectionMap(board)+"" == ",,,1,4,2,4,2,1,3,3,3,3,4,2,4,2,3");

        console.assert(makeDirectionMap(prepareMap(level1String))+"" == 
            ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2");

        console.assert(makeDirectionMap(prepareMap(level2String))+"" == 
        ",,,,,,,,,,,,,,,,,,,,,,,,,,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,1,2,4,2,4,2,4,2,4,2,4,2,4,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,2,3,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,3,4,3,3,3,3,3,3,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,3,4,3,3,3,3,3,3");

        console.assert(makeDirectionMap(prepareMap(level3String))+"" == 
        ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,4,2,4,2,4,2,4,1,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,3,3,3,3,1,2,3,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,3,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,3,3,3");
        
        console.assert(makeDirectionMap(prepareMap(level4String))+"" == 
            ",,,,,,,,,,,,,,,,,,,,,,,,,,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,2,4,1,4,2,4,2,4,2,4,2,4,2,4,2,4,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,4,1,3,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,1,3,4,3,3,3,3,3,3,3,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,4,2,3,4,2,3,4,2,3,4,2,3,4,2,3,4,2,4,2,4,2,4,2,4,2,3,4,3,3,3,3,3,3,3");
    }

    function getDirectionsTest() {
        console.assert(getDirections(prepareMap(level1String), getPosition(0,0)) == "");
        console.assert(getDirections(prepareMap(level1String), getPosition(3,1)) == "2,4");
        console.assert(getDirections(prepareMap(level1String), getPosition(1,1)) == "2,4");
        console.assert(getDirections(prepareMap(level1String), getPosition(4,0)) == "");
    
        console.assert(getDirections(prepareMap(level2String), getPosition(0,0)) == "");
        console.assert(getDirections(prepareMap(level2String), getPosition(5,1)) == "2,4");
        console.assert(getDirections(prepareMap(level2String), getPosition(5,2)) == "3");
        console.assert(getDirections(prepareMap(level2String), getPosition(1,2)) == "3");
    
        console.assert(getDirections(prepareMap(level3String), getPosition(0,0)) == "");
        console.assert(getDirections(prepareMap(level3String), getPosition(5,4)) == "2,4");
        console.assert(getDirections(prepareMap(level3String), getPosition(1,2)) == "3");
        console.assert(getDirections(prepareMap(level3String), getPosition(32,4)) == "3");
    }

    function solveGameTest() {
        var board1 = prepareMap(level1String);
        var level1Elements = getMapElements(board1);
        console.assert(JSON.stringify(solveGame(makeDirectionMap(board1), level1Elements.exit, level1Elements.player, level1Elements.goldBags, [])) == 
            '[{"position":{"x":15,"y":1},"direction":2},{"position":{"x":14,"y":1},"direction":2},{"position":{"x":13,"y":1},"direction":2},{"position":{"x":12,"y":1},"direction":2},{"position":{"x":11,"y":1},"direction":2},{"position":{"x":10,"y":1},"direction":2},{"position":{"x":9,"y":1},"direction":2},{"position":{"x":8,"y":1},"direction":2},{"position":{"x":7,"y":1},"direction":2},{"position":{"x":6,"y":1},"direction":2},{"position":{"x":5,"y":1},"direction":2},{"position":{"x":4,"y":1},"direction":2},{"position":{"x":3,"y":1},"direction":4},{"position":{"x":4,"y":1},"direction":4},{"position":{"x":5,"y":1},"direction":4},{"position":{"x":6,"y":1},"direction":4},{"position":{"x":7,"y":1},"direction":4},{"position":{"x":8,"y":1},"direction":4},{"position":{"x":9,"y":1},"direction":4},{"position":{"x":10,"y":1},"direction":4},{"position":{"x":11,"y":1},"direction":4},{"position":{"x":12,"y":1},"direction":4},{"position":{"x":13,"y":1},"direction":4},{"position":{"x":14,"y":1},"direction":4},{"position":{"x":15,"y":1},"direction":4},{"position":{"x":16,"y":1},"direction":4},{"position":{"x":17,"y":1},"direction":4},{"position":{"x":18,"y":1},"direction":4},{"position":{"x":19,"y":1},"direction":4},{"position":{"x":20,"y":1},"direction":4},{"position":{"x":21,"y":1},"direction":4},{"position":{"x":22,"y":1},"direction":4},{"position":{"x":23,"y":1},"direction":4},{"position":{"x":24,"y":1},"direction":4},{"position":{"x":25,"y":1},"direction":4},{"position":{"x":26,"y":1},"direction":4}]');

        var board2 = prepareMap(level2String);
        var level2Elements = getMapElements(board2);
        console.assert(JSON.stringify(solveGame(makeDirectionMap(board2), level2Elements.exit, level2Elements.player, level2Elements.goldBags, [])) == 
            '[{"position":{"x":11,"y":1},"direction":4},{"position":{"x":12,"y":1},"direction":4},{"position":{"x":13,"y":1},"direction":4},{"position":{"x":14,"y":1},"direction":4},{"position":{"x":15,"y":1},"direction":4},{"position":{"x":16,"y":1},"direction":4},{"position":{"x":17,"y":1},"direction":4},{"position":{"x":18,"y":1},"direction":4},{"position":{"x":19,"y":1},"direction":1},{"position":{"x":19,"y":2},"direction":1},{"position":{"x":19,"y":3},"direction":1},{"position":{"x":19,"y":4},"direction":2},{"position":{"x":18,"y":4},"direction":2},{"position":{"x":17,"y":4},"direction":2},{"position":{"x":16,"y":4},"direction":2},{"position":{"x":15,"y":4},"direction":2},{"position":{"x":14,"y":4},"direction":2},{"position":{"x":13,"y":4},"direction":2},{"position":{"x":12,"y":4},"direction":2},{"position":{"x":11,"y":4},"direction":2},{"position":{"x":10,"y":4},"direction":2},{"position":{"x":9,"y":4},"direction":2},{"position":{"x":8,"y":4},"direction":2},{"position":{"x":7,"y":4},"direction":2},{"position":{"x":6,"y":4},"direction":2},{"position":{"x":5,"y":4},"direction":2},{"position":{"x":4,"y":4},"direction":2},{"position":{"x":3,"y":4},"direction":2},{"position":{"x":2,"y":4},"direction":2},{"position":{"x":1,"y":4},"direction":2}]');

        var level3String = "    H  $    ---------- $    S    \n    H#######         #########   \n    H                            \n    H        $   &               \n#################################";
        var board3 = prepareMap(level3String);
        var level3Elements = getMapElements(board3);
        console.assert(JSON.stringify(solveGame(makeDirectionMap(board3), level3Elements.exit, level3Elements.player, level3Elements.goldBags, [])) == 
            '[{"position":{"x":17,"y":1},"direction":2},{"position":{"x":16,"y":1},"direction":2},{"position":{"x":15,"y":1},"direction":2},{"position":{"x":14,"y":1},"direction":2},{"position":{"x":13,"y":1},"direction":2},{"position":{"x":12,"y":1},"direction":2},{"position":{"x":11,"y":1},"direction":2},{"position":{"x":10,"y":1},"direction":2},{"position":{"x":9,"y":1},"direction":2},{"position":{"x":8,"y":1},"direction":2},{"position":{"x":7,"y":1},"direction":2},{"position":{"x":6,"y":1},"direction":2},{"position":{"x":5,"y":1},"direction":2},{"position":{"x":4,"y":1},"direction":1},{"position":{"x":4,"y":2},"direction":1},{"position":{"x":4,"y":3},"direction":1},{"position":{"x":4,"y":4},"direction":4},{"position":{"x":5,"y":4},"direction":4},{"position":{"x":6,"y":4},"direction":4},{"position":{"x":7,"y":4},"direction":4},{"position":{"x":8,"y":4},"direction":4},{"position":{"x":9,"y":4},"direction":4},{"position":{"x":10,"y":4},"direction":4},{"position":{"x":11,"y":4},"direction":4},{"position":{"x":12,"y":4},"direction":4},{"position":{"x":13,"y":4},"direction":4},{"position":{"x":14,"y":4},"direction":4},{"position":{"x":15,"y":4},"direction":4},{"position":{"x":16,"y":4},"direction":4},{"position":{"x":17,"y":4},"direction":4},{"position":{"x":18,"y":4},"direction":4},{"position":{"x":19,"y":4},"direction":4},{"position":{"x":20,"y":4},"direction":4},{"position":{"x":21,"y":4},"direction":4},{"position":{"x":22,"y":4},"direction":4},{"position":{"x":23,"y":4},"direction":4},{"position":{"x":24,"y":4},"direction":4},{"position":{"x":25,"y":4},"direction":4},{"position":{"x":26,"y":4},"direction":4},{"position":{"x":27,"y":4},"direction":4}]');
    }

    function getGoldBagsRemainingTest() {
        
    }

    function prepareMapTest() {
        console.assert(prepareMap(level1String) == 
            "#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#, , , ,$, , , , ,$, , , , , , ,&, , , ,$, , , , , , , ,S, ");

        console.assert(prepareMap(level2String) == 
            "#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#, , , , , , , , , , , ,&, , , , , , , ,H, , , , , , , , , , , , , , , , , , , , , , , , , ,H, , , , , , ,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,H, , , , , , ,S, , , , , , , ,$, ,$, ,$, , , , , , ,H, , , , , , ");

        console.assert(prepareMap(level3String) == 
            "#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#,#, , , , ,H, , , , , , , , ,$, , , ,&, , , , , , , , , , , , , , , , , , , ,H, , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,H,#,#,#,#,#,#,#, , , , , , , , , ,#,#,#,#,#,#,#,#,#, , , , , , , ,H, , ,$, , , , ,-,-,-,-,-,-,-,-,-,-, ,$, , , , ,S, , , , ");
    }

    function getMapElementsTest() {
        console.assert(getMapElements(prepareMap(level1String)).player.x == 15);
        console.assert(getMapElements(prepareMap(level1String)).player.y == 1);
        console.assert(getMapElements(prepareMap(level1String)).exit.x == 27);
        console.assert(getMapElements(prepareMap(level1String)).exit.y == 1);
        console.assert(JSON.stringify(getMapElements(prepareMap(level1String)).goldBags) == 
            '[{"x":3,"y":1},{"x":8,"y":1},{"x":19,"y":1}]');

        console.assert(getMapElements(prepareMap(level2String)).player.x == 11);
        console.assert(getMapElements(prepareMap(level2String)).player.y == 1);
        console.assert(getMapElements(prepareMap(level2String)).exit.x == 0);
        console.assert(getMapElements(prepareMap(level2String)).exit.y == 4);
        console.assert(JSON.stringify(getMapElements(prepareMap(level2String)).goldBags) == 
            '[{"x":8,"y":4},{"x":10,"y":4},{"x":12,"y":4}]');

        console.assert(getMapElements(prepareMap(level3String)).player.x == 17);
        console.assert(getMapElements(prepareMap(level3String)).player.y == 1);
        console.assert(getMapElements(prepareMap(level3String)).exit.x == 28);
        console.assert(getMapElements(prepareMap(level3String)).exit.y == 4);
        console.assert(JSON.stringify(getMapElements(prepareMap(level3String)).goldBags) == 
            '[{"x":13,"y":1},{"x":7,"y":4},{"x":23,"y":4}]');
    }

    getPositionTest();
    isLadderTest();
    isRopeTest();
    isBrickTest();
    getNextPositionTest();
    getPositionOfTopCellTest();
    getPositionOfBottomCellTest();
    getPositionOfRightCellTest();
    getPositionOfLeftCellTest();
    isUpMoveValidTest();
    isDownMoveValidTest();
    isRightMoveValidTest();
    isLeftMoveValidTest();
    makeDirectionMapTest();
    getDirectionsTest();
    solveGameTest();
    getGoldBagsRemainingTest();
    prepareMapTest();
    getMapElementsTest();
}

tests();

// XXX Important : ne pas modifier ces lignes
module.exports.room = room;
module.exports.start = start;
module.exports.next = next;