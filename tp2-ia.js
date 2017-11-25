var room = "Mario-Laurent";

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

// "Enum" for block types.
var BlockType = {
    Brick: "#",
    Player: "&",
    Point: "$",
    Ladder: "H",
    Rope: "-",
    End: "S",
    Space: " ",
};

// Predicate for blocks that can't be traversed unless removed
function isSolid (block) {
    return block == BlockType.Brick;
}

// Predicate for blocks that can be either solid or non-solid depending on the action
function isSemiSolid (block) {
    return block == BlockType.Ladder 
        || block == BlockType.Rope;
}

// Predicate for blocks that player can fall through
function isNonSolid (block) {
    return block == BlockType.Point 
    || block == BlockType.End
    || block == BlockType.Space;
}

function isObjective (block) {
    return block == BlockType.Point 
        || block == BlockType.End;
}

/*
*******************************************************************************
**  Solving algorithm

    Start function:
    1: 
        Find every platform
        Platform definition:
            A platform is an horizontal blocks where you can go from one end to
            the other without moving in the y dimension.

            Note: This is 3 platform: 

                1: from (1,2) to (3,2)
                2: from (4,1) to (4,1) (One block)
                3: from (5,2) to (7,2)
                y
               x01234567
                1   #
                2#######


            Platform = {
                xStart: Int,
                xEnd: Int,
                y: Int,
                length: function () { return this.xEnd - this.xStart + 1; }
                reachedFrom: [Platform],
                reachTo: [Platform],
                objectives: [Objective],
                isStart: Bool
            }

            Objective = {
                blockType = BlockType, // Contains either a $ or S
                x: Int,
                y: Int
            }

        By this definition, we can define a graph between platforms and their connections.
        Obviously, at step 1, reachedFrom = reachTo = []

        To support level 4 where a point ("$") is not directly above a platform, 
        a point creates a platform if it's not right above one. In case the end is
        suspended in mid-air, it also creates a platform. This can be generalized
        by considering each non-block objective square as a platform to reach.

    2: 
        Find every connection between platform. 
        The connections can be detected by:
            Looking for ladders
            Looking for edges to fall
            Looking at removeable blocks

        For each connection, add reference to reached platform to reaching platform and vice-versa

    3: Check if solvable.
        Check if path exists between start and end
        We can use a breadth searching algorithm that prevents infinite loop.
        If exists, yay
        If not, return error

    4: Translate path between platforms in path between individual positions

    5: Save path in variable accessible to the next function

    Next function:
    1: Read next position. We don't care about the state as every is static and already computed

*/

function start(map) {
    var mapLines = prepareMap(map);
    var mapLinesNoNeutrals = mapLines.slice(1, mapLines.length - 1);
    
    //console.log(mapLines.map(line => line.join("")));

    var platforms = mapLinesNoNeutrals.map((line, index) => {
        // Note that: mapLines.indexOf(line) == index + 1
        var lineOver = mapLines[index];
        var lineUnder = mapLines[index + 2];

        return getPlatformsOnLine(line, lineOver, lineUnder, index + 1);
    });
    var platforms2 = flattenArray(platforms);
    //console.log(platforms2);
    var platforms3 = addObjectives(mapLines, platforms2);
    console.log(platforms2);
}

///////////////////////////////////////////////////////////////////////////////
//  Map preparation

// Takes a map and returns it in a easier to use format.
// It splits the map in arrays of characters and removes the empty lines at
// beginning and at the end. 
// It makes sure to put one "neutral" line at the beginning and at the end.
// prepareMap :: String -> [[Char]]
function prepareMap(map) {
    // Split lines
    var lines = map.split("\n"); 

    // Removes leading empty lines
    lines = dropWhile(lines, (line => line.trim() == ""));
    // Removes trailing empty lines
    lines = dropWhile(lines.reverse(), (line => line.trim() == "")).reverse();

    // Splits lines in [char]
    lines = lines.map(line => line.split("")); 

    var lineOver = lines[0].map(char => " "); // Neutral top line
    var lineUnder = lineOver.map(char => "#"); // Neutral under line

    // Add neutral lines
    var result = [lineOver].concat(lines);
    result.push(lineUnder);

    return result;
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

var count = 0;
var right = true;

function next(state) {
    if (right) {
        count--;
    } else {
        count++;
    }

    if (count == -15 || count == 15) {
        right = !right;
    }
    // TODO : Modifier ici
    // Envoyer une direction au hasard
    //var dir = Math.floor(Math.random() * 4) + 1;
    var dir = right ? 4 : 2;
    return {event: "move", direction: dir};
}

// XXX Important : ne pas modifier ces lignes
module.exports.room = room;
module.exports.start = start;
module.exports.next = next;


///////////////////////////////////////////////////////////////////////////////
//  Utils

// Concat array of arrays together
// flattenArray :: [[a]] -> [a]
function flattenArray(arrays) {
    return arrays.reduce((accum, array) => accum.concat(array), []);
}

// Drop elements of array from left to right while pred is true
function dropWhile (arr, pred) {
    var drop = true;
    return arr.reduce((accum, elem) => {
        drop = drop && pred(elem);
        if (!drop)
            accum.push(elem);

        return accum;
    }, []);
}