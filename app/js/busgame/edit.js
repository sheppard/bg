define(["d3", "wq/app", "wq/store", "wq/photos"],
function(d3, app, ds, photos) {
return {
    'name': 'edit',
    'init': function(){},
    'run': function(page, mode, id) {
        if (page == 'pointtype' && mode == 'edit') {
            edit(id);
        }
    }
};

function edit(id) {

app.models.pointtype.find(id).then(function(pointtype) {

var layouts = {
    'tile-1': [1, 1],
    'alt-4': [2, 2],
    'anim-4': [4, 1],
    'auto-16': [4, 4]
};

var layout = layouts[pointtype.layout];
var cw = document.body.clientWidth;
var ch = document.body.clientHeight;
var tileSize = 32;
var gridSize = Math.floor((cw < ch ? cw : ch) / (tileSize + 2));

var renderSize = tileSize * gridSize;
var imgWidth = layout[0] * tileSize;
var imgHeight = layout[1] * tileSize;

var canvas = d3.select('.draw').append('canvas')
   .attr('width', renderSize + (gridSize * 2))
   .attr('height', renderSize + (gridSize * 2));

var touchInfo = {};
canvas.on('touchstart', function(evt) {
    var touches = d3.touches(this);
    touchInfo.start = {
        'x': touches[0][0],
        'y': touches[0][1]
    }
    touchInfo.offset = {
        'x': o.x,
        'y': o.y
    };
});
canvas.on('touchmove', function(evt) {
    var touches = d3.touches(this);
    var tx = touches[0][0] - touchInfo.start.x;
    var ty = touches[0][1] - touchInfo.start.y;
    console.log("touchmove", tx, ty);
});
canvas.on('click', click);

var context = canvas.node().getContext('2d');
context.webkitImageSmoothingEnabled = false;
context.mozImageSmoothingEnabled = false;
context.imageSmoothingEnabled = false;
var image = document.createElement('canvas')
image.width = imgWidth;
image.height = imgHeight;
var imageContext = image.getContext('2d');
var img = d3.select('.draw img').node();
initImage();
update();
/*
   img.onload = function() {
    initImage();
    update();
};
*/

function update() {
    context.drawImage(
        image,
        0,
        0,
        tileSize,
        tileSize,
        gridSize,
        gridSize,
        renderSize,
        renderSize
    );
    var name = pointtype.code + '.png';
    var data = image.toDataURL("image/png").split(',')[1];
    photos.base64toBlob(data).then(function(blob) {
        var file = {
            'name': name,
            'type': 'image/png',
            'body': blob
        };
        ds.set(name, file).then(function() {
            $('[name=path]').val(name);
        });
    });
}

function initImage() {
    imageContext.drawImage(img, 0, 0);
}

function click() {
    var coords = d3.mouse(this);
    var x = Math.round(coords[0] / gridSize - 1.5);
    var y = Math.round(coords[1] / gridSize - 1.5);
    var pixel = imageContext.createImageData(1, 1);
    var p = pixel.data;
    p[0] = 127;
    p[1] = 127;
    p[2] = 230;
    p[3] = 255;
    imageContext.putImageData(pixel, x, y);
    update();
}

});

}

});
