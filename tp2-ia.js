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
    Player: '&',
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
                reachedFrom: [PlatformAccess], // todo: Check if necessary
                reachTo: [PlatformAccess],
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
            Looking for ropes
            Looking for edges to fall
            Looking at removeable blocks

            Ladder = {
                x: Int,
                yStart: Int,
                yEnd: Int
            }

            Rope = {
                xStart: Int,
                xEnd: Int,
                y: Int
            }

            Fall = {
                x: Int,
                yStart: Int,
                yEnd: Int
            }

            PlatformAccess = {
                platform: Platform,
                access: Ladder | Rope | Fall
            }

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
    console.log(map);
    var mapLines = prepareMap(map);
    //console.log(mapLines.map(line => line.join("")));

    var platforms = findPlatforms(mapLines);

    makePlatformGraph(mapLines, platforms);

    console.log("\n\n\n\n################################\n");
    console.log(platforms[0].reachedFrom.length);
    console.log(platforms[0].reachedFrom.length == platforms[0].reachTo.length);
    console.log("\n\n\n\n################################\n");
    console.log(platforms[0].reachedFrom[0].platform.reachedFrom);
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

///////////////////////////////////////////////////////////////////////////////
//  Step 1

// Finds all platforms in map
function findPlatforms(mapLines) {
    // We ignore the first and last line because they were added
    var mapLinesNoNeutrals = mapLines.slice(1, mapLines.length - 1);

    var platforms = flattenArray(mapLinesNoNeutrals.map((line, index) => {
        // Note that: mapLines.indexOf(line) == index + 1
        var lineOver = mapLines[index];
        var lineUnder = mapLines[index + 2];

        return getPlatformsOnLine(line, lineOver, lineUnder, index + 1);
    }));

    var platformsObjectives = platforms.map(platform => addObjectives(mapLines, platform));

    var taggedPlatforms = tagStart(mapLines, platformsObjectives);

    return taggedPlatforms;
}

// Takes 3 lines and the y position of the first line.
// The current line to search for platforms
// The line right above to check for obstacle on the line
// The line under to check if an is in mid-air
// Returns platform on the first line
function getPlatformsOnLine(line, lineOver, lineUnder, y) {

    return line.reduce(function (platforms, char, index) {

        // Check if block is a platform
        // And if block isn't blocked by a block on top, else pass
        if (isSolid(char) && !isSolid(lineOver[index])) {

            // Checks if a platform exists right next to the position were evaluating
            if (platforms.length > 0 
                && platforms[platforms.length - 1].xEnd == index - 1) {

                var platform = platforms[platforms.length - 1];
                var newPlatform = extendPlatformRight(platform);

                platforms[platforms.length - 1] = newPlatform;
                return platforms
            }
            
            // Else, we create a new one
            var newPlatform = createEmptyPlatform(index, y);
            platforms.push(newPlatform);
            return platforms;
        }

        // We add a platform in the case of an floating objective
        if (isObjective(char) && !isSolid(lineUnder[index])) {
            var newPlatform = createEmptyPlatform(index, y + 1);
            platforms.push(newPlatform);
            return platforms;
        }

        return platforms;
    }, []);
}

// Creates an empty platform at coordinates (x,y) of length 1
function createEmptyPlatform(x,y) {
    return {
        xStart: x,
        xEnd: x,
        y: y,
        length: function () { return this.xEnd - this.xStart + 1; },
        reachedFrom: [],
        reachTo: [],
        objectives: [],
        isStart: false
    };
}

// Returns a shallow copy of platform
// Extends a platform one block to the right
function extendPlatformRight(platform) {
    var newPlatform = Object.assign({}, platform); // Shallow copy (Necessary?)
    newPlatform.xEnd++;
    return newPlatform;
}

// Adds the objectives over a platform
function addObjectives(mapLines, platform) {
    var lineOver = mapLines[platform.y - 1]
        .slice(platform.xStart, platform.xEnd + 1);

    var currentLine = mapLines[platform.y]
        .slice(platform.xStart, platform.xEnd + 1);

    var objectives = lineOver.reduce((accum, square, x) => {
        if (isObjective(square)) {
            var objective = {
                x: x + platform.xStart,
                y: platform.y - 1,
                blockType: square
            }
            accum.push(objective);
        }

        return accum;
    }, []);

    platform.objectives = objectives;

    return platform;
}

// Set isStart to true for platform where player start
function tagStart(mapLines, platforms) {
    return platforms.map(platform => {
        var isStart = mapLines[platform.y - 1]
            .filter(char => char == BlockType.Player)
            .length != 0;
        
        if (isStart)
            platform.isStart = isStart
        
        return platform;
    });
}

///////////////////////////////////////////////////////////////////////////////
//  Step 2

function makePlatformGraph(mapLines, platforms) {
    var vertices = findVertices(mapLines, platforms);
        
    vertices.ladders.forEach(ladder => {
        linkPlatforms(ladder, getPlatformsReachableFromLadder(ladder, platforms));
    });
    
    vertices.ropes.forEach(rope => {
        linkPlatforms(rope, getPlatformsReachableFromRope(rope, platforms));
    });

    // TODO :: Do same thing for falls

    // Remove duplicate vertices and self references in platform.reachedFrom and reachTo
    platforms.forEach((platform, index, platforms) => {
        platform.reachedFrom = removeDuplicate(platform.reachedFrom)
            .filter(x => x.platform != platform);
        platform.reachTo = removeDuplicate(platform.reachTo)
            .filter(x => x.platform != platform);
    });

    return platforms;
}

// Find all possible ways to move between platforms.
// They correspond to vertices in the graph
// These are:
// Ladders
// Ropes
// Falling (Digging or edge)
function findVertices(mapLines, platforms) {
    return {
        ladders: findLadders(mapLines),
        ropes: findRopes(mapLines),
        //falls: find // TODO
    };
}

function findLadders(mapLines) {
    return flattenArray(transpose(mapLines).map(findLaddersOnColumn));
}

function findLaddersOnColumn(column, x) {
    return column.reduce((ladders, char, index) => {

        if (char == BlockType.Ladder) {
            // Checks if a ladder exists above to the position were evaluating
            if (ladders.length > 0 
                && ladders[ladders.length - 1].yEnd == index - 1) {

                ladders[ladders.length - 1].yEnd++;
            } else {
                // We create a new one
                var newLadder = {
                    x: x,
                    yStart: index,
                    yEnd: index
                };
                ladders.push(newLadder);
            }
        }
        
        return ladders;
    }, []);
}

function findRopes(mapLines) {
    return flattenArray(mapLines.map(findRopeOnLine));
}

function findRopeOnLine(line, y) {
    return line.reduce((ropes, char, index) => {
        if (char == BlockType.Rope) {
            // Checks if a rope exists right next to the position were evaluating
            if (ropes.length > 0 
                && ropes[ropes.length - 1].xEnd == index - 1) {

                ropes[ropes.length - 1].xEnd++;
            } else {
                // We create a new one
                var newRope = {
                    xStart: index,
                    xEnd: index,
                    y: y
                };
                ropes.push(newRope);
            }
        }
        
        return ropes;
    }, []);
}

function findFallsBetweenPlatforms(mapLines, platforms) {
    // TODO
}

function linkPlatforms(access, platforms) {
    var platformAccessPairs = platforms.map(platform => {
        return {
            platform: platform,
            access: access
        };
    });

    return platforms.map(platform => {
        platform.reachedFrom = platform.reachedFrom.concat(platformAccessPairs);
        platform.reachTo = platform.reachTo.concat(platformAccessPairs);
        return platform
    });
}

function getPlatformsReachableFromLadder(ladder, platforms) {
    return platforms.filter(platform => {
        var besidePlatform = 
            (ladder.x == platform.xStart - 1 || ladder.x == platform.xEnd + 1)  // If beside
            && (ladder.yStart <= platform.y && ladder.yEnd >= platform.y);      // If share a y

        var overPlatform = 
            ladder.yEnd == platform.y - 1                                       // If right over
            && ladder.x >= platform.xStart && ladder.x <= platform.xEnd;        // If share a x

        return besidePlatform || overPlatform;
    })
}

function getPlatformsReachableFromRope(rope, platforms) {
    return platforms.filter(platform => {

        var overPlatform = 
            rope.xStart <= platform.xEnd + 1 || rope.xEnd >= platform.xStart - 1;

        var shareHeight = rope.y + 1 == platform.y

        return shareHeight && overPlatform;
    })
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

// Opération de transposition comme en algèbre linéaire
// arrays est un tableau de tableau.
// On suppose que les tableaux intérieurs partage la même dimension
function transpose (mat) {
    if (mat.length == 0)
        return [];
    if (mat[0].length == 0)
        return [[]];

    return mat[0].map(function(elem, y) {
        return mat.map(function(ligne, x) {
            return mat[x][y]; // Élément de colonne
        });
    });
};

// Algorithme naif pas très efficace, mais on ne trie pas de gros tableaux
function removeDuplicate (array) {
    return array.sort().reduce((accum, elem, index) => {
        if (accum.length >= 0 && accum.length[index - 1] != elem) 
            accum.push(elem);

        return accum;
    }, []);
}

var level1String = "   $    $      &   $       S \n#############################";
var level2String = "S       $ $ $      H      \n###################H      \n                   H      \n           &       H      \n##########################";
var level3String = "    H  $    ---------- $    S    \n    H#######         #########   \n    H                            \n    H        $   &               \n#################################";
var level4String = "  $ $$  ------    H       \n#########     ####H       \n                 #H       \n  S              #H   &   \n##########################";
var level5String = "H#######  H               \nH         H#$             \nH         H#              \nH         H#------        \nH      H &H#      $       \nH      H####     #########\nH      H#                 \nH      H#   $           S \n##########################";
var level6String = "                     H######\n  S   H#########H    H#    #\n  ####H         H    H# $ $#\n      H         H    H######\n      H   ------H----H     #\nH#########H     H    H     #\nH         H     H    H     #\nH         H#####H    H     #\n##H###H         H###########\n  H   H         H      #####\n  H   H------   H      # $ #\n####  H     #######H########\n      H            H        \n      H        &   H        \n############################\n";

start(level2String);
exit();
