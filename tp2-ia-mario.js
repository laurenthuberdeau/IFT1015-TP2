// TODO : modifier cette valeur avec la clé secrète
var room = "laurent";

var GameEnum = {
    function: {
        start: "start",
        next: "next"
    },
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

var game = {
    nextExpectedFunction: GameEnum.function.start,
    nStart: 0,
    nNext: undefined,
    nRows: undefined,
    nSol: undefined,
    nCols: undefined,
    board: undefined,
    current: {
        row: undefined,
        col: undefined
    },
    exit: {
        row: undefined,
        col: undefined
    },
    goldBags: undefined,
    moves: undefined,
    movesIndex: undefined,
    lastCmd: undefined
};

var isLadder = function (board, position) {
    return board[position.row][position.col] == GameEnum.symbol.ladder;
};

var isRope = function (board, position) {
    return board[position.row][position.col] == GameEnum.symbol.rope;
};

var isBrick = function (board, position) {
    return board[position.row][position.col] == GameEnum.symbol.brick;
};

var addMove = function (moves, position, direction) {
    return moves.concat({position: position, direction: direction});
}

var isUpMoveValid = function (board, position) {
    return position.row != board.length - 1 // Not on top row
        && isLadder(board, position) // On ladder
        && !isBrick(board, getPositionOfTopCell(position)); // No brick above
};

var isDownMoveValid = function (board, position) {
    return position.row != 0 // Not on bottom row  
        && !isBrick(board, getPositionOfBottomCell(position)); // No brick under position 
};

var isRightMoveValid = function (board, position) {
    var onRightColumn = position.col == board[0].length - 1;
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
    var onLeftColumn = position.col == 0;
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

var getPosition = function (row, col) {
    return {row: row, col: col};
};

var getPositionOfTopCell = function (position) {
    return getPosition(position.row + 1, position.col);
};

var getPositionOfBottomCell = function (position) {
    return getPosition(position.row - 1, position.col);
};

var getPositionOfRightCell = function (position) {
    return getPosition(position.row, position.col + 1);
};

var getPositionOfLeftCell = function (position) {
    return getPosition(position.row, position.col - 1);
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

var buildGraph = function (board) {
    var graph = board.map(function (columns, row) {
        return columns.map(function (cell, col) {
            return getDirections(board, getPosition(row, col));
        });
    });
    return graph;
};

var getPath = function (graph, position, end, forbiddenCells, moves) {
    // Exit reached!
    if (position.row == end.row && position.col == end.col)
        return moves;

    // We're on a forbidden cell
    if (forbiddenCells
            .filter(cell => cell.row == position.row && cell.col == position.col)
            .length != 0)
        return [];
    
    // Possible choice of directions at current position
    // We filter moves that brings us to an already visited position
    var directions = graph[position.row][position.col]
        .filter(direction => {
            var newPosition = getNextPosition(position, direction);
            return moves
                .map(move => move.position)
                .find(move => move.row == newPosition.row && move.col == newPosition.col) === undefined;
        });
    
    // look in all directions to find a path
    var solutions = directions
        .map(function(direction) {
            return getPath(
                graph,
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

// Solve graph using dynamic programming
function solveGraph(graph, currentPosition, goldBags, goldCollected) {
    // No more gold bags to collect. Go to exit
    if (goldBags.length == 0)
        return getPath(graph, currentPosition, game.exit, goldBags, []);

    var solutions = goldBags
        .map(function(goldBag) {
            var goldCollected2 = goldCollected.concat(goldBag);
            var goldToCollect = getGoldBagsRemaining(goldBags, goldCollected2);

            var solution = getPath(graph, currentPosition, goldBag, goldToCollect, []);
            if (solution.length == 0)
                return [];

            // 
            var solutionAfter = solveGraph(graph, goldBag, goldToCollect, goldCollected2);
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
function start(b) {

    // display paramameters
    console.log("===> start");
    // b = "                          \n                          \nS     $ $   $      H      \n###################H      \n                   H      \n           &       H      \n##########################";
    console.log("b=" + b);

    // assert expected function
    console.assert(game.nextExpectedFunction == GameEnum.function.start, "Unexpected function called, we were expecting " + game.nextExpectedFunction);

    // assert unsupported levels
    // console.assert(game.nStart < 4, "game.nStart should < 4 as only the first 4 levels are supported");

    // increment & reset function counters
    game.nStart++;
    game.nNext = 0;
    game.lastCmd = undefined;
    console.log("game.nStart=" + game.nStart);
    
    // set next expected funciton to next
    game.nextExpectedFunction = GameEnum.function.next;
    
    // transform the board from a string to an array of array (rows x columns) where row 0 is at the bottom and column 0 is at the left
    game.board = b.replace(/\n$/, "").split("\n").reverse().map(function (line) {
        return Array.from(line);
    });
    game.nRows = game.board.length;
    game.nCols = game.board[0].length;
    console.log("game.nRows=" + game.nRows);
    console.log("game.nCols=" + game.nCols);

    // print the board
    for (var i = game.nRows - 1; i >= 0; i--) {
        console.log(i + game.board[i].join(""));
    }
    var ligne = ""
    for (var i = 0; i < game.nCols; i++) {
        ligne += i % 10;
    }
    console.log(" " + ligne);

    // get player, exit and gold bags positions
    game.goldBags = [];
    game.board.forEach(function (row, rowIndex) {
        row.forEach(function (cell, colIndex) {
            if (game.board[rowIndex][colIndex] == GameEnum.symbol.player) {
                game.current.row = rowIndex;
                game.current.col = colIndex;
            }
            else if (game.board[rowIndex][colIndex] == GameEnum.symbol.exit) {
                game.exit.row = rowIndex;
                game.exit.col = colIndex;
            }
            else if (game.board[rowIndex][colIndex] == GameEnum.symbol.goldBag) {
                game.goldBags.push({row: rowIndex, col: colIndex});
            }
        });
    });

    // remove player from board
    game.board[game.current.row][game.current.col] = GameEnum.symbol.empty;

    // build graph of all possible moves
    var graph = buildGraph(game.board);
    game.moves = solveGraph(graph, game.current, game.goldBags, []);
    game.movesIndex = 0;
    console.log("game.moves:" + JSON.stringify(game.moves));
    console.assert(game.moves.length > 0, "did not find a solution for level " + game.nStart);
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

    // display paramameters
    console.log("===> next");
    console.log("state=" + JSON.stringify(state));
    
    // assert expected function
    console.assert(game.nextExpectedFunction == GameEnum.function.next, "Unexpected function called, we were expecting " + game.nextExpectedFunction);

    // increment function counter
    game.nNext++;
    console.log("game.nNext=" + game.nNext);

    // transform x & y into row and col
    var row = game.nRows - 1 - state.runner.position.y;
    var col = state.runner.position.x;
    console.log("[row][col]=[" + row + "][" + col + "]");

    // redo the last move command because the server did not process it (nice!)
    if (row != game.current.row || col != game.current.col) {
        console.log("unexpected position detected: received [" + row + "][" + col + "] but was expecting [" + game.current.row + "][" + game.current.col + "]");
        console.log("resubmitting the same command: " + JSON.stringify(game.lastCmd));
        return game.lastCmd;
    }
    // console.assert(row == game.current.row, "row does not have the expected value");
    // console.assert(col == game.current.col, "col does not have the expected value");

    // get direction
    console.log("game.moves=" + JSON.stringify(game.moves));
    console.log("game.movesIndex=" + game.movesIndex);
    var direction = game.moves[game.movesIndex].direction;
    console.log("direction=" + direction);

    // not the last move, so compute next expected position and increment array index for next move
    if (game.movesIndex < game.moves.length - 1) {
        var nextPosition = game.moves[game.movesIndex + 1].position;
        game.current = nextPosition;
        game.movesIndex++;
        console.log("game.current=" + JSON.stringify(game.current));
        console.log("game.movesIndex=" + game.movesIndex);
    }
    else {  // this is the last move, set next expected function to start
        console.log("this is the last move of the level");
        game.nextExpectedFunction = GameEnum.function.start;
    }

    // return the move command
    console.log("direction=" + direction);
    var cmd = {event: "move", direction: +direction};
    game.lastCmd = cmd;
    console.log("cmd=" + JSON.stringify(cmd));
    return cmd;
}

// XXX Important : ne pas modifier ces lignes
module.exports.room = room;
module.exports.start = start;
module.exports.next = next;