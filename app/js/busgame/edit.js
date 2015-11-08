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
var $page = $.mobile.activePage;
var red = 0, blue = 0, green = 0, alpha = 255;
var write = true;

$page.find('button#pick-color').click(function() {
    write = false;
});
$page.find('input#current-color').change(function() {
    var rgb = $(this).val().match(/#(..)(..)(..)/);
    if (rgb) {
        red = parseInt(rgb[1], 16);
        green = parseInt(rgb[2], 16);
        blue = parseInt(rgb[3], 16);
        alpha = 255;
    }
});
$page.find('.theme-square').click(function() {
    var color = $(this).css('background-color');
    if (color == 'transparent') {
        red = 0;
        green = 0;
        blue = 0;
        alpha = 0;
    }
    var rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgb) {
        red = +(rgb[1]);
        green = +(rgb[2]);
        blue = +(rgb[3]);
        alpha = 255;
    }
    var rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d\.]+)\)/);
    if (rgba) {
        red = +(rgba[1]);
        green = +(rgba[2]);
        blue = +(rgba[3]);
        alpha = rgba[4] * 255;
    }
    updateColor();
});
function hex(val) {
    var out = val.toString(16);
    if (val < 16) {
        out = '0' + out;
    }
    return out;
}
function updateColor() {
    var color;
    if (alpha > 0) {
        color = '#' + hex(red) + hex(green) + hex(blue);
    } else {
        color = '#252525';
    }
    console.log(color);
    $page.find('#current-color').val(color);
}

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
if (gridSize < 16) {
    gridSize = 16;
}

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
    context.clearRect(
        gridSize,
        gridSize,
        renderSize,
        renderSize
    )
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
$page.find('button#mirror-ltr').click(function() {
    imageContext.save();
    imageContext.scale(-1, 1);
    imageContext.drawImage(
       image,
       0, 0, tileSize / 2, tileSize,
       -tileSize, 0, tileSize / 2, tileSize
    );
    imageContext.restore();
    update();
});

function initImage() {
    imageContext.drawImage(img, 0, 0);
}

function click() {
    var coords = d3.mouse(this);
    var x = Math.round(coords[0] / gridSize - 1.5);
    var y = Math.round(coords[1] / gridSize - 1.5);
    var p;
    if (!write) {
        p = imageContext.getImageData(x, y, 1, 1).data;
        red = p[0];
        green = p[1];
        blue = p[2];
        alpha = p[3];
        write = true;
        updateColor();
        return;
    }
    var pixel = imageContext.createImageData(1, 1);
    var p = pixel.data;
    p[0] = red;
    p[1] = green;
    p[2] = blue;
    p[3] = alpha;
    imageContext.putImageData(pixel, x, y);
    update();
}

});

}

});
