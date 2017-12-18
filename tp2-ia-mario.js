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
    if (position.row == 0) {    // we are on the bottom row
        return false;
    }
    var bottomCellPosition = getPositionOfBottomCell(position);
    if (isBrick(board, bottomCellPosition)) {    // the bottom cell is a brick
        return false;
    }
    return true;
};

// todo: Refactor
var isRightMoveValid = function (board, position) {

    if (position.col == board[0].length - 1) {    // we are on the rightmost column 
        return false; 
    } 
    var rightCellPosition = getPositionOfRightCell(position); 
    if (isBrick(board, rightCellPosition)) {    // the right cell is a brick 
        return false; 
    } 
    if (isLadder(board, position) || isRope(board, position)) {    // the current cell is a ladder or a rope 
        return true; 
    } 
    if (position.row == 0) {    // we are on the bottom row, we are falling through the bottom of the board 
        return false; 
    } 
    var bottomCellPosition = getPositionOfBottomCell(position); 
    if (isBrick(board, bottomCellPosition) || isLadder(board, bottomCellPosition)) {    // we are on top of a brick or a ladder 
        return true; 
    } 
    return false; 

    var onRightColumn = position.col == board[0].length - 1;  
    var brickOnRight = isBrick(board, getPositionOfRightCell(position));  
    return !onRightColumn && !brickOnRight; 
    
    return position.col != board[0].length - 1 // Not 
        && !isBrick(board, getPositionOfRightCell(position)); // No brick on right
};

// todo: Refactor
var isLeftMoveValid = function (board, position) {  

    if (position.col == 0) {    // we are on the leftmost column 
        return false; 
    } 
    var leftCellPosition = getPositionOfLeftCell(position); 
    if (isBrick(board, leftCellPosition)) {    // the left cell is a brick 
        return false; 
    } 
    if (isLadder(board, position) || isRope(board, position)) {    // the current cell is a ladder or a rope 
        return true; 
    } 
    if (position.row == 0) {    // we are on the bottom row, we are falling through the bottom of the board 
        return false; 
    } 
    var bottomCellPosition = getPositionOfBottomCell(position); 
    if (isBrick(board, bottomCellPosition) || isLadder(board, bottomCellPosition)) {    // we are on top of a brick or a ladder 
        return true; 
    } 
    return false; 

    var onLeftColumn = position.col == 0;  
    var brickOnLeft = isBrick(board, getPositionOfRightCell(position));  
    return !(onLeftColumn || brickOnLeft);  

    return position.col != 0
        && !isBrick(board, getPositionOfLeftCell(position));
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
    console.log(board);
    var graph = board.map(function (columns, row) {
        return columns.map(function (cell, col) {
            return getDirections(board, getPosition(row, col));
        });
    });
    return graph;
};

var getOtherGoldBags = function (goldBags) {
    var otherGoldBags = [];
    for (var i = 0; i < game.goldBags.length; i++) {
        var found = false;
        for (var j = 0; j < goldBags.length; j++) {
            if (game.goldBags[i].row == goldBags[j].row && game.goldBags[i].col == goldBags[j].col) {
                found = true;
                break;
            }
        }
        if (!found) {
            otherGoldBags.push(game.goldBags[i]);
        }
    }
    return otherGoldBags;
}

var getPath2 = function (graph, position, end, without, moves) {    
    // exit with the solution if we reached the destination
    if (position.row == end.row && position.col == end.col) {
        console.log("solution: yes");
        return moves;
    }

    // exit with "not a solution" if we reached an unallowed cell
    for (var i = 0; i < without.length; i++) {
        if (position.row == without[i].row && position.col == without[i].col) {
            return [];
        }
    }

    // get last direction
    var lastDirection = moves[moves.length - 1].direction;
    console.log("lastDirection=" + lastDirection);
    
    // compute the opposite of the last direction
    var lastDirectionOpposite = [undefined, 3, 4, 1, 2][lastDirection];
    console.log("lastDirectionOpposite=" + lastDirectionOpposite);
    
    // get possible directions
    var directions = graph[position.row][position.col].slice();
    console.log("directions=" + JSON.stringify(directions));
    
    // remove the opposite direction if present
    var index = directions.indexOf(lastDirectionOpposite);
    console.log("index=" + index);
    if (index != -1) {
        directions.splice(index, 1);
        console.log("directions=" + JSON.stringify(directions));
    }

    // exit with "not a solution" if we reached a dead end
    if (directions.length == 0) {
        console.log("solution: no (dead end)");
        return [];
    }

    // look in all directions to find a path
    var solutions = [];
    var solution;
    for (var i = 0; i < directions.length; i++) {

        // skip the direction if we already did this move
        var skipDirection = false;
        for (var j = 0; j < moves.length; j++) {
            if (moves[j].position.row == position.row && moves[j].position.col == position.col && moves[j].direction == directions[i]) {
                skipDirection = true;
                break;
            }
        }
        if (skipDirection) {
            break;
        }

        // find best solution in that direction
        var solution = getPath2(graph, getNextPosition(position, directions[i]), end, without, addMove(moves, position, directions[i]));
        if (solution.length > 0) {
            solutions.push(solution);
        }
    }

    // get best solution
    var bestSolution = [];
    if (solutions.length > 0) {
        bestSolution = solutions[0];
        for (var i = 1; i < solutions.length; i++) {
            if (solutions[i].length < bestSolution.length) {
                bestSolution = solutions[i];
            }
        }
    }

    // return the best solution (which may be an empty solution meaning that a path have not been found)
    return bestSolution;
}

var getPath = function (graph, begin, end, without) {
    console.log("getPath")
    console.log("begin=" + JSON.stringify(begin));
    console.log("end=" + JSON.stringify(end));
    console.log("without=" + JSON.stringify(without));
    
    // get possible directions
    var directions = graph[begin.row][begin.col];
    
    // exit with "not a solution" if we reached a dead end
    if (directions.length == 0) {
        console.log("solution: no (dead end)");
        return [];
    }    

    // look in all directions to find a path
    var solutions = [];
    var solution;
    for (var i = 0; i < directions.length; i++) {
        // find best solution in that direction
        solution = getPath2(graph, getNextPosition(begin, directions[i]), end, without, addMove([], begin, directions[i]));
        if (solution.length > 0) {
            solutions.push(solution);
        }
    }

    // get best solution
    var bestSolution = [];
    if (solutions.length > 0) {
        bestSolution = solutions[0];
        for (var i = 1; i < solutions.length; i++) {
            if (solutions[i].length < bestSolution.length) {
                bestSolution = solutions[i];
            }
        }
    }

    // return the best solution (which may be an empty solution meaning that a path have not been found)
    return bestSolution;
};

var solveGraph = function (graph) {
    console.log("solveGraph");
    var bestSolution = [];
    for (var i = 0; i < game.goldBags.length; i++) {
        var solution1 = getPath(graph, game.current, game.goldBags[i], getOtherGoldBags([game.goldBags[i]]));
        console.log("the best solution between " + JSON.stringify(game.current) + " and " + JSON.stringify(game.goldBags[i]) + " and without going through " + JSON.stringify(getOtherGoldBags([game.goldBags[i]])) + " is " + JSON.stringify(solution1));
        console.log(solution1.map(function(move) {return move.direction}).join(""));
        if (solution1.length > 0) {
            for (var j = 0; j < game.goldBags.length; j++) {
                if (j != i) {
                    var solution2 = getPath(graph, game.goldBags[i], game.goldBags[j], getOtherGoldBags([game.goldBags[i], game.goldBags[j]]));
                    console.log("the best solution between " + JSON.stringify(game.goldBags[i]) + " and " + JSON.stringify(game.goldBags[j]) + " and without going through " + JSON.stringify(getOtherGoldBags([game.goldBags[i], game.goldBags[j]])) + " is " + JSON.stringify(solution2));
                    console.log(solution2.map(function(move) {return move.direction}).join(""));
                    if (solution2.length > 0) {
                        for (var k = 0; k < game.goldBags.length; k++) {
                            if (k != i && k != j) {
                                var solution3 = getPath(graph, game.goldBags[j], game.goldBags[k], []);
                                console.log("the best solution between " + JSON.stringify(game.goldBags[j]) + " and " + JSON.stringify(game.goldBags[k]) + " is " + JSON.stringify(solution3));
                                console.log(solution3.map(function(move) {return move.direction}).join(""));
                                if (solution3.length > 0) {
                                    var solution4 = getPath(graph, game.goldBags[k], game.exit, []);
                                    console.log("the best solution between " + JSON.stringify(game.goldBags[k]) + " and " + JSON.stringify(game.exit) + " is " + JSON.stringify(solution4));
                                    console.log(solution4.map(function(move) {return move.direction}).join(""));
                                    if (solution4.length > 0) {
                                        var solution = solution1.concat(solution2).concat(solution3).concat(solution4);
                                        console.log("this is a complete solution between " + JSON.stringify(game.current) + " and " + JSON.stringify(game.exit) + " is " + JSON.stringify(solution));
                                        console.log(solution.map(function(move) {return move.direction}).join(""));
                                        if (bestSolution.length == 0 || solution.length < bestSolution.length) {
                                            bestSolution = solution;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    console.log("the final solution between " + JSON.stringify(game.current) + " and " + JSON.stringify(game.exit) + " is " + JSON.stringify(bestSolution));
    console.log(bestSolution.map(function(move) {return move.direction}).join(""));
    console.log("solveGraph - end");
    return bestSolution;
};

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
    game.moves = solveGraph(graph);
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