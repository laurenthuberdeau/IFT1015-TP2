// Constants
const blockDimension = 32; // Fraction entière de 32, dimension des images
const blockKeys = ["-", "&", "#", "$", "H", "S", "X"];
const imgDirectory = "img/";

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

    // TODO :: Resize canvas based on map size

    var canvas = createCanvas(lines.length * blockDimension, lines[0].length * blockDimension);
    drawCanvas(canvas.getContext("2d"), lines);
}

function createCanvas(height, width) {
    // Create canvas element in DOM
    var container = document.getElementById('grid');
    container.innerHTML = "<canvas id=\"canvas\"></canvas>";

    // Set canvas properties
    var canvas = document.getElementById('canvas');
    canvas.height = height;
    canvas.width = width;

    // Put green background
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "#afa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
}

function drawCanvas(canvasCtx, lines) {
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
                canvasCtx.drawImage(img, x, y, blockDimension, blockDimension);
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