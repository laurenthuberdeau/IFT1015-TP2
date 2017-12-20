/* 
 * Nom du programme: tp2-graphique.js
 * Auteurs: Laurent Huberdeau (p1171029) & Mario Dubreuil (p0152501)
 * Date de création: 2017-DEC-19
 *
 * Description: Dessine un niveau du jeu sur un canvas avec les images données.
 */


// Constants
const blockDimension = 32; // Fraction entière de 32, dimension des images
const blockKeys = ["-", "&", "#", "$", "H", "S", "X"];
const imgDirectory = "img/";

// Used to know if canvas needs to be recreated
const canvasDimensions = {
    width: undefined,
    height: undefined
};

var draw = function (map) {
    // If every image is loaded
    var allImagesReady = blockKeys
        .map(getImage)
        .filter(img => img.complete)
        .length != 0;

    // Return early if not every image is loaded
    if (!allImagesReady)
        return; 

    var lines = map.split("\n"); // Split map in lines

    var canvas = document.getElementById("canvas");

    var canvasWidth = lines[0].length;
    var canvasHeight = lines.length;
    if (canvasDimensions.width != canvasWidth || canvasDimensions.height != canvasHeight) {
        canvasDimensions.width = canvasWidth;
        canvasDimensions.height = canvasHeight;
        canvas = createCanvas(canvasHeight * blockDimension, canvasWidth * blockDimension);
    }

    drawCanvas(canvas, lines);
}

function createCanvas(height, width) {
    // Create canvas element in DOM
    var container = document.getElementById('grid');
    container.innerHTML = "<canvas id=\"canvas\"></canvas>";

    // Set canvas properties
    var canvas = document.getElementById('canvas');
    canvas.height = height;
    canvas.width = width;

    return canvas;
}

function drawCanvas(canvas, lines) {
    var context = canvas.getContext("2d");

    // Put green background + clear canvas
    context.fillStyle = "#afa";
    context.fillRect(0, 0, canvas.width, canvas.height);

    lines.forEach((line, i) => {
        line.split("").forEach((char, j) => {

            // Do nothing if char doesn't represent a block. i.e a space or something else
            if (blockKeys.indexOf(char) == -1)
                return;
            
            var img = getImage(char);
            var x = j * blockDimension;
            var y = i * blockDimension;

            // Don't draw image if it's not loaded yet
            if (img.complete)
                context.drawImage(img, x, y, blockDimension, blockDimension);
        });
    });
}

var getImage = (function () {
    var images = blockKeys.map(function (name)  {
        var img = new Image();
        img.src = imgDirectory + escape(name) + ".png";
        return img;
    });

    return function (char) {
        var index = blockKeys.indexOf(char);
        return images[index];
    };
})();