define(["d3", "wq/app"], function(d3, app) {
return {
    'name': 'play',
    'init': function(){},
    'run': function(page) {
        if (page == 'play' || page == 'playbg' || page == 'edit') {
            $('body').css('overflow-y', 'hidden');
            play(page);
        } else {
            $('body').css('overflow-y', 'auto');
        }
    }
};

function play(mode) {

var panels = {
    'inited': false
};
function showPanel(name) {
    d3.values(panels).forEach(function(panel) {
        if (panel.style) {
            panel.style('display', 'none');
            panel.visible = false;
        }
    });
    panels[name].style('display', 'block');
    panels[name].visible = true;
}
if (mode == 'play') {
    panels.init = d3.select('#init-panel');
    panels.list = d3.select('#team-list-panel');
    panels.edit = d3.select('#team-edit-panel');
    panels.ship = d3.select('#ship-panel');
    showPanel('init');

    panels.list.select('#add-team').on('click', function() {
        showPanel('edit');
    });
    panels.edit.select('#save-team').on('click', function() {
        var theme_id = panels.edit.selected_theme;
        if (!theme_id) {
            return;
        }
        var name = panels.edit.select('input').node().value;
        socket.send('TEAM ' + name.replace(' ', '_') + ' ' + theme_id);
        showPanel('list');
    });
    panels.list.pickTeam = function(team) {
        socket.send('JOIN ' + team.id);
        panels.list.selected_team = team;
        updateShips();
        showPanel('ship');
    };
    panels.ship.select('#save-ship').on('click', function() {
        var ship_id = panels.ship.selected_ship;
        if (!ship_id) {
            return;
        }
        var name = panels.ship.select('input').node().value;
        socket.send('SHIP ' + ship_id + ' ' + name.replace(' ', '_'));
        panels.ship.style('display', 'none');
        startAnim(unknown);
        d3.timer(refresh);
    });
}

var intervals = {};

var ptypes = {};
app.models.pointtype.prefetch().then(function(data) {
    data.list.forEach(function(ptype) {
        ptypes[ptype.id] = ptype;
        ptype.themes = {};
        if (ptype.layout_id.match(/anim/)) {
            startAnim(ptype);
        }
    });
    refreshSprites();
});

function getSprite(type_id, theme_id) {
    var ptype = ptypes[type_id], path;
    if (!ptype) {
         return null;
    }
    if (theme_id) {
        path = theme_id + '/' + ptype.path;
    } else {
        theme_id = 'DEFAULT';
        path = ptype.path;
    }

    if (ptype.themes[theme_id] && ptype.themes[theme_id].complete) {
        return ptype.themes[theme_id];
    }

    if (!ptype.themes[theme_id]) {
        var timg = ptype.themes[theme_id] = new Image();
        timg.onload = refreshSprites;
        timg.src = '/media/' + path;
    }
    return null;
}

function refreshSprites() {
    if (panels.list.visible || panels.edit.visible) {
        updateTeams();
    }
    if (panels.ship.visible) {
        updateShips();
    }
}

var themes = {};
app.models.theme.load().then(function(data) {
    data.list.forEach(function(theme) {
        themes[theme.id] = theme;
    });
});
var unknown = {
    'layout_id': 'anim-4',
    'image': new Image()
};
unknown.image.src = '/images/spin.png';

var layouts = {
    'tile-1': [1, 1],
    'alt-4': [2, 2],
    'anim-4': [4, 1],
    'dir-4': [1, 4],
    'auto-16': [4, 4],
    'diranim-16': [4, 4]
};
var dirIndex = {
    'u': 0,
    'r': 1,
    'd': 2,
    'l': 3
}

var jumps = 1;

var tileSize = 32;
var bufferScale = 16;
var renderSize = tileSize;
var bgtop = (mode == 'edit' ? 50 : 0);
var bounds = {
    'w': document.body.clientWidth,
    'h': document.body.clientHeight - bgtop
};
var length = bounds.w > bounds.h ? bounds.w : bounds.h;
while(length / renderSize > 20) {
    renderSize += tileSize;
}
var scale = renderSize / tileSize;
var bg = d3.select('#play').append('div')
    .style('position', 'fixed')
    .style('width', '100%')
    .style('height', '100%')
    .style('top', bgtop + 'px')
    .style('left', '0px');

addBackground();
function addBackground() {
    for (var bgx = 0; bgx <= (bounds.w / renderSize / 8); bgx++) {
        for (var bgy = 0; bgy <= (bounds.h / renderSize / 8); bgy++) {
            bg.append('img')
                .attr('src', '/media/bg/0/' + scale + '/' + bgx + '/' + bgy + '.png')
                .style('position', 'fixed')
                .style('left', (bgx * renderSize * 8) + 'px')
                .style('top', (bgy * renderSize * 8 + bgtop) + 'px')
        }
    }
}

var count = 128; // should load from server
var o = {};
o.x = Math.round(Math.random() * count / 2 + count / 4);
o.y = Math.round(Math.random() * count / 2 + count / 4);
o.w = Math.floor(bounds.w / renderSize / 2) * 2 + 2;
o.h = Math.floor(bounds.h / renderSize / 2) * 2;
if (mode != 'edit') {
    o.h += 2;
}
var last = {'x': o.x, 'y': o.y, 'w': o.w, 'h': o.h};
var scope = {'x': o.x, 'y': o.y, 'w': 20, 'h': 20};
var swidth = renderSize * o.w;
var sleft = (bounds.w - swidth) / 2;
var sheight = renderSize * o.h;
var stop = (bounds.h - sheight) / 2;
if (mode == 'edit') {
    stop += 40;
}
var grid = {};
var teams = {};
var starts = [];
var teamThemes = [];
var ships = [];
var players = {};
var playerId;
var buffer = 8;

function nav(d, anim) {
    o.x = d.x;
    o.y = d.y;
    if (o.x < buffer) o.x = buffer;
    if (o.y < buffer) o.y = buffer;
    if (o.x > count - buffer) o.x = count - buffer;
    if (o.y > count - buffer) o.y = count - buffer;
    if (Math.abs(scope.x - o.x) > 3 || Math.abs(scope.y - o.y) > 3) {
        scope.x = Math.round(o.x);
        scope.y = Math.round(o.y);
    }
    if (anim) {
        if (o.x != last.x || o.y != last.y) {
            noffset.attr('x', last.x);
            noffset.attr('y', last.y);
            o.b = 5;
            noffset.transition().duration(300)
               .attr('x', o.x)
               .attr('y', o.y)
               .each('end', function() {
                   o.b = 1;
               });
            last.x = o.x;
            last.y = o.y;
        }
    } else {
        noffset.attr('x', o.x);
        noffset.attr('y', o.y);
        last.x = o.x;
        last.y = o.y;
    }
}

var canvas = d3.select('#play').append('canvas')
   .style('position', 'fixed')
   .attr('width', swidth)
   .attr('height', sheight)
   .style('left', sleft + 'px')
   .style('top', stop + 'px');

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
    nav({
        'x': touchInfo.offset.x - (tx / renderSize),
        'y': touchInfo.offset.y - (ty / renderSize)
    });
});
canvas.on('click', click);

var context = canvas.node().getContext('2d');
context.webkitImageSmoothingEnabled = false;
context.mozImageSmoothingEnabled = false;
context.imageSmoothingEnabled = false;
var buffers = {};

var minicanvas = d3.select('#play')
    .append('canvas')
    .attr('style', 'position:fixed;right:5px;;bottom:5px;border: 2px solid #333;background-color:#111');
var mini = {
    'canvas': {
        'all': document.createElement('canvas'),
        'hist': document.createElement('canvas'),
        'current': minicanvas.node()
    },
    'context': {}
};
minicanvas.on('click', function() {
    var coords = d3.mouse(this);
    nav({'x': coords[0], 'y': coords[1]}, true);
});

for (cname in mini.canvas) {
    mini.canvas[cname].width = count;
    mini.canvas[cname].height = count;
    mini.context[cname] = mini.canvas[cname].getContext('2d');
}

var custom = d3.select(document.createElement('custom-elem'));
var minielem = d3.select(document.createElement('custom-elem-mini'));
var noffset = d3.select(document.createElement('custom-elem-offset'));


noffset.attr('x', o.x);
noffset.attr('y', o.y);
o.b = 1;

function startAnim(ptype) {
    ptype.frame = 0;
    var interval = ptype.interval || 150;
    if (!intervals[interval]) {
        makeInterval(interval);
    }
    intervals[interval].ptypes.push(ptype);
}

function makeInterval(interval) {
    intervals[interval] = {
        'interval': setInterval(anim, interval),
        'ptypes': []
    }
    function anim() {
        intervals[interval].ptypes.forEach(function(ptype) {
            ptype.frame++;
            if (ptype.frame > 3)
                ptype.frame = 0;
        });
        render();
    }
}


var socket = new WebSocket('ws://' + window.location.host + ':10234');
socket.onmessage = function(msg) {
    var parts = msg.data.split(' ');
    var cmd = parts.shift();
    commands[cmd].apply(this, parts);
}

var commands = {};
commands['THEMES'] = function() {
    teamThemes = Array.prototype.slice.call(arguments);
    if (panels.list.visible || panels.edit.visible) {
        updateTeams();
    }
    if (!panels.inited) {
        showPanel('list');
        panels.inited = true;
    }
}
commands['SHIPS'] = function() {
    ships = Array.prototype.slice.call(arguments);
}
commands['TEAM'] = function(id, name, theme_id, score) {
    var team = teams[id] || {};
    team.id = id;
    team.name = name.replace('_', ' ') || 'Team ' + id;
    team.theme_id = theme_id;
    team.score = score;
    teams[id] = team;
    updateTeams();
}
commands['SCORE'] = function(id, score) {
    var team = teams[id] || {};
    team.id = id;
    team.score = score;
    teams[id] = team;
    updateScore();
}

commands['GRID'] = function(level) {
    var rows = level.split('\n');
    // width = rows[0].length;
    // height = rows.length;
    rows.forEach(function(row, y) {
        row.split('').forEach(function(type, x) {
            if (!grid[x])
                grid[x] = {};
            grid[x][y] = {
                'x': x,
                'y': y,
                'type_id': type,
                'theme_id': null,
                'orientation': null
            };
        });
    });
    renderMap();
}

commands['POINT'] = function(x, y, type, theme, orientation) {
    var pt = grid[x][y];
    pt.x = +x;
    pt.y = +y;
    pt.type_id = type;
    pt.theme_id = theme;
    pt.orientation = orientation;
    if (ptypes[pt.type_id].layer == 'e') {
        drawPixel(pt, mini.context.all);
    }
    if (pt.type_id == 'X' && pt.theme_id == teams[players[playerId].team_id].theme_id) {
        starts.push(pt);
    }
}

commands['PLAYER'] = function(pid, team, name, type, x, y, lives, hp, assign) {
    if (mode != 'play') {
         return;
    }
    var player = players[pid] || {};
    player.id = pid;
    player.team_id = team;
    player.name = name.replace('_', ' ') || 'Player ' + pid;
    player.type_id = type;
    player.x = +x;
    player.y = +y;
    var hit = player.lives > +lives;
    player.lives = +lives;
    player.hp = +hp;
    players[pid] = player;
    if (assign) {
        playerId = pid;
        nav(player);
        updateScore();
    }
    if (hit) {
        showMessage(player.name + " took a hit");
    } else if (!messageVisible) {
        showMessage(player.name + " has joined team " + teams[player.team_id].name);
    }
    if (panels.ship.visible) {
        updateShips();
    }
};
commands['HP'] = function(pid, hp) {
    var player = players[pid] || {};
    player.id = pid;
    if (+hp < player.hp) {
        player.temp_theme_id = '火';
    } else {
        player.temp_theme_id = '木';
    }
    if (hp < 3 && !player.warning) {
        player.warning = setInterval(function() {
            if (player.temp_theme_id) {
                player.temp_theme_id = null;
            } else {
                player.temp_theme_id = '火';
            }
        }, 500);
    } else {
        clearInterval(player.warning);
        player.warning = null;
        setTimeout(function() {
            player.temp_theme_id = null;
        }, 500);
    }
    player.hp = +hp;
    players[pid] = player;
    updateScore();
}
commands['LIVES'] = function(pid, lives) {
    var player = players[pid] || {};
    player.id = pid;
    player.lives = +lives;
    players[pid] = player;
    updateScore();
}
commands['GAMEOVER'] = function(pid) {
    var name = players[pid].name || 'Player ' + pid;
    delete players[pid];
    showMessage("Game over for " + name);
}
commands['MESSAGE'] = function() {
    var message = Array.prototype.slice.call(arguments).join(" ");
    showMessage(message);
}
commands['PROJECTILE'] = function(pid, type, x, y, direction, destroy) {
    if (mode != 'play') {
         return;
    }
    var proj = players[pid] || {};
    proj.id = pid;
    proj.player_id = pid.split('-')[0];
    proj.type_id = type;
    proj.x = +x;
    proj.y = +y;
    proj.direction = direction;
    players[proj.player_id].orientation = direction;
    players[proj.player_id].fired = direction;
    setTimeout(function() {
        players[proj.player_id].fired = false;
    }, 200);
    proj.destroy_type_id = destroy;
    proj.is_proj = true;
    players[pid] = proj;
}

commands['PATH'] = function() {
    if (mode != 'play') {
         return;
    }
    var pid = arguments[0];
    var path = Array.prototype.slice.call(arguments, 1);
    var player = players[pid] || {};
    var ppath = {}, lastStep;
    path.forEach(function(step, i) {
        var parts = step.match(/^(\d+):(\d+),(\d+)$/);
        if (!parts) {
            return;
        }
        var f = +parts[1];
        if (i == 0) {
            if (f < tickFrame || (f > 950 && tickFrame < 50)) {
                tickFrame = f;
            } else {
                var anyMoving = false;
                Object.keys(players).forEach(function(opid) {
                    if (opid == pid)
                        return;
                    if (players[opid].moving) {
                        anyMoving = true;
                    }
                });
                if (!anyMoving) {
                    tickFrame = f;
                }
            }
        }
        ppath[f] = lastStep = {
            'x': +parts[2],
            'y': +parts[3]
        };
    });
    player.path = ppath;
    player.target = lastStep;
    players[pid] = player;
    if (pid == playerId) {
        var tid = pid + '-target-' + Math.floor(Math.random() * 1000);
        players[tid] = {
            'id': tid,
            'x': lastStep.x,
            'y': lastStep.y,
            'type_id': null,
            'is_target': true,
            'destroy_type_id': 'T',
            'theme_id': teams[player.team_id].theme_id
        };
        explode(players[tid], 30);
    }
}

var ticker = null;
var last = [];
var interval = 100;
commands['TICK'] = function(f) {
    if (ticker) {
        clearInterval(ticker);
    }
    var current = tickFrame;
    var server = +f;
    if (current === null || Math.abs(current - server) > 100) {
        tickFrame = server;
    } else if (server % 100 == 0) {
        var off;
        if (current < server || (server == 0 && current > 900)) {
            off = current % 100;
        } else {
            off = 100 + current % 100;
        }
        interval = interval * (off / 100);
    }
    if (interval < 25) {
        interval = 25;
    }
    if (interval > 125) {
        interval = 125;
    }

    // d3.select('#score').text(Math.round(interval * 10000) / 10000);
    updateFrame();
    ticker = setInterval(tick, interval / 4);
}

function _getViewport() {
    var minx = Math.max(0, Math.floor(o.x - o.w / 2 - o.b)),
        maxx = Math.min(count, Math.ceil(o.x + o.w / 2 + o.b)),
        miny = Math.max(0, Math.floor(o.y - o.h / 2 - o.b)),
        maxy = Math.min(count, Math.ceil(o.y + o.h / 2 + o.b));
    return {
        'min': {'x': minx, 'y': miny},
        'max': {'x': maxx, 'y': maxy},
    }
}

var tickFrame = null;
function tick() {
    if (tickFrame === null) {
        return;
    }
    tickFrame += 0.25;
    tickFrame = tickFrame % 1000;
    // d3.select('#loc').text(Math.floor(tickFrame));
    updateFrame();
}
function updateFrame() {
    for (var pid in players) {
        var player = players[pid];
        if (!player || !player.path) {
            continue;
        }
        var t1 = Math.floor(tickFrame);
        var t2 = Math.ceil(tickFrame) % 1000;
        var off = tickFrame - t1;
        var coords1 = player.path[t1];
        var coords2 = player.path[t2];
        var coords;
        var orientation;
        var ptype;
        if (!coords1 && !coords2) {
            var maxt = d3.max(Object.keys(player.path));
            var mint = d3.min(Object.keys(player.path));
            if (player.path[0] && player.path[999]) {
                maxt = d3.max(Object.keys(player.path).filter(function(d) {
                    return d < 800;
                }));
                mint = d3.min(Object.keys(player.path).filter(function(d) {
                    return d >= 800;
                }));
            }
            if (mint > tickFrame && mint < tickFrame + 50) {
                // FIXME: catch wraparound?
            } else {
                coords = player.target || player;
                if (player.is_proj) {
                     explode(player);
                }
                player.path = null;
                player.target = null;
                player.moving = false;
                ptype = ptypes[grid[coords.x][coords.y]];
            }
        } else if (coords1 && coords2) {
            coords = {
                'x': ((1-off) * coords1.x + off * coords2.x),
                'y': ((1-off) * coords1.y + off * coords2.y)
            };
            if (coords1.x != coords2.x || coords1.y != coords2.y) {
                if (coords1.x > coords2.x) {
                    orientation = 'l';
                } else if (coords1.x < coords2.x) {
                    orientation = 'r';
                } else if (coords1.y < coords2.y) {
                    orientation = 'd';
                } else {
                    orientation = 'u';
                }
            }
            var ptype1 = ptypes[grid[coords1.x][coords1.y].type_id];
            var ptype2 = ptypes[grid[coords2.x][coords2.y].type_id];
            if (ptype2 && ptype2.layer == 'a') {
                ptype = ptype2;
            } else {
                ptype = ptype1;
            }
        } else {
            coords = coords1 || coords2;
            ptype = ptypes[grid[coords.x][coords.y]];
        }
        if (coords) {
            player.x = coords.x;
            player.y = coords.y;
        }
        if (orientation) {
            player.orientation = orientation;
            player.moving = 2;
        } else {
            if (player.moving) {
                player.moving--;
            }
        }
        if (t1 == tickFrame && player.moving) {
             for (var pid2 in players) {
                  var player2 = players[pid2];
                  if (player.x == player2.x && player.y == player2.y && player.id != player2.id && (player.orientation != player2.orientation || !!player.moving != !!player2.moving)) {
                       collide(player, player2);
                  }
             }
        }
        if (ptype) {
            player.under = (ptype.layer == 'a');
        }
    }
}

function explode(player, interval) {
   if (player.type_id == player.destroy_type_id) {
       return;
   }
   if (!interval) {
       interval = 150;
   }
   player.type_id = player.destroy_type_id;
   player.frame = 0;
   player.destroy = setInterval(function() {
       player.frame++;
       if (player.frame > 3) {
            clearInterval(player.destroy);
            delete players[player.id];
       }
   }, interval);
}

function collide(player1, player2) {
    if (player2.is_proj && !player1.is_proj) {
        collide(player2, player1);
        return;
    }
    if (!player1.is_proj) {
        return;
    }
    delete players[player1.id];
    if (player2.is_proj) {
        player2.destroy_type_id = 'x';
        explode(player2);
    }
}

function refresh() {
    var buffers = _getBuffers(_getViewport());
    context.clearRect(0, 0, swidth, sheight);
    drawPlayers(true, true);
    drawPlayers(true, false);
    buffers.forEach(function(buffer) {
        var ox = (noffset.attr('x') - o.w / 2 - (buffer.x * bufferScale)) * renderSize;
        var oy = (noffset.attr('y') - o.h / 2 - (buffer.y * bufferScale)) * renderSize;
        context.drawImage(
            buffer.canvas,
            0,
            0,
            tileSize * bufferScale,
            tileSize * bufferScale,
            -ox,
            -oy,
            renderSize * bufferScale,
            renderSize * bufferScale
        );
    });
    drawPlayers(false, true);
    drawPlayers(false, false);
}

function drawPlayers(under, proj) {
    if (!ptypes) return;
    var viewport = _getViewport();
    for (var pid in players) {
        var player = players[pid];
        if (!player.x || !player.y) {
            continue;
        }
        if (!!player.under != !!under) {
            continue;
        }
        if (!!player.is_proj != !!proj) {
            continue;
        }
        if (player.x < viewport.min.x - 1
            && player.y < viewport.min.y - 1
            && player.x > viewport.max.x + 1
            && player.y > viewport.max.y + 1) {
            continue;
        }
        if (!getTileActive(player.x, player.y)) {
            continue;
        }
        drawPlayer(player);
    }
}
function drawPlayer(player) {
    var theme_id = player.temp_theme_id || player.theme_id || (player.team_id && teams[player.team_id].theme_id);
    var img = getSprite(player.type_id, theme_id);
    if (!img) {
        return;
    }
    var tileOffset = _tileXY(player);
    context.drawImage(
        img,
        tileOffset.x * tileSize,
        tileOffset.y * tileSize,
        tileSize,
        tileSize,
        (player.x - (noffset.attr('x') - o.w / 2)) * renderSize,
        (player.y - (noffset.attr('y') - o.h / 2)) * renderSize,
        renderSize,
        renderSize
    );
    if (player.is_proj) {
        return;
    }
    if (player.moving) {
        var fx = player.x, fy = player.y;
        if (player.orientation == 'r') {
            fx--;
        } else if (player.orientation == 'l') {
            fx++;
        } else if (player.orientation == 'u') {
            fy++;
        } else if (player.orientation == 'd') {
            fy--;
        }
        drawExtra(player, 'f', fx, fy);
    } else if (player.id == playerId) {
        var offsets = [
            [0, -2], [-2, 0], [2, 0], [0, 2],
            [0, -1], [-1, 0], [1, 0], [0, 1]
        ];
        offsets.forEach(function(offset) {
            var fx = player.x + offset[0];
            var fy = player.y + offset[1];
            var dir = canFire(player,fx, fy);
            var theme_id = null;
            if (dir) {
                if (player.fired == dir) {
                    theme_id = teams[player.team_id].theme_id;
                }
                drawExtra(player, 'R', fx, fy, dir, theme_id);
            }
        });
    }
}

function drawExtra(player, type_id, fx, fy, dir, theme_id) {
    if (!dir) {
        dir = player.orientation;
    }
    tileOffset = _tileXY({
        'type_id': type_id,
        'orientation': dir
    });
    var img = getSprite(type_id, theme_id);
    if (!img) {
        return;
    }
    context.drawImage(
        img,
        tileOffset.x * tileSize,
        tileOffset.y * tileSize,
        tileSize,
        tileSize,
        (fx - (noffset.attr('x') - o.w / 2)) * renderSize,
        (fy - (noffset.attr('y') - o.h / 2)) * renderSize,
        renderSize,
        renderSize
    );
}


setInterval(cleanup, 10000);
function cleanup() {
    var current = _getBuffers(_getViewport());
    var tl = current[0];
    var br = current[current.length - 1];
    var x, y;
    for (x in buffers) {
        for (y in buffers[x]) {
            if (x < tl.x - 1 || x > br.x + 1 || y < tl.y - 1 || y > br.y + 1) {
                console.log("deleting buffer:" + x + ',' + y);
                delete buffers[x][y];
            }
        }
    }
}

function render() {
    if (!ptypes) return;
    var viewport = _getViewport(),
        minx = viewport.min.x,
        maxx = viewport.max.x,
        miny = viewport.min.y,
        maxy = viewport.max.y;
        current = _getTiles(minx, miny, maxx, maxy);
    current.forEach(function(d) {
        d.tileOffset = _tileXY(d);
        d.tileLoaded = !!getSprite(d.type_id, d.theme_id);
        d.tileActive = getTileActive(d.x, d.y);
        // d.tileSeen = talpha > 0;
    });
    var pts = custom.selectAll('tile')
        .data(current, function(d){
            return (
                d.x + '/' + d.y + '/' +
                d.type_id + '/' + d.theme_id + '/' + d.tileLoaded + '/' +
                d.tileOffset.x + '/' + d.tileOffset.y + '/' +
                d.tileActive
            );
        });
    draw(pts.enter().append('tile'));
    pts.exit().remove();
}

function updateScore() {
    var player = players[playerId];
    var team = teams[player.team_id];
    d3.select('#score').text('● ' + team.score);
    d3.select('#jumps').text('🚀 ' + player.lives);
    d3.select('#loc').text('♥ ' + player.hp);
}

setInterval(_minimap, 2000);
function _minimap() {
    drawMap(mini.context.hist, mini.canvas.all);

    var context = mini.context.current;
    context.clearRect(0, 0, count, count);
    context.save();
    context.globalAlpha = 0.3;
    context.drawImage(mini.canvas.hist, 0, 0);
    context.restore();

    drawMap(context, mini.canvas.all, true);
    _tileActiveCache = {};
}

function drawMap(context, img, withPlayers) {
    if (!players[playerId] || !players[playerId].team_id) {
        context.drawImage(img, 0, 0);
        return;
    }
    for (var pid in players) {
        var player = players[pid];
        if (player.team_id == players[playerId].team_id) {
            drawClipped(context, img, player, withPlayers);
        }
    }
    starts.forEach(function(start) {
        drawClipped(context, img, start, withPlayers);
    });
}

function drawClipped(context, img, pt, withPlayers) {
    context.save();
    context.beginPath();
    context.arc(pt.x, pt.y, 16, 0, 2 * Math.PI, false);
    context.clip();
    context.drawImage(img, 0, 0);
    if (withPlayers) {
        for (var pid in players) {
            var p = players[pid];
            if (!p.is_proj && !p.is_target) {
                context.fillStyle = themes[teams[p.team_id].theme_id].primary2;
                context.fillRect(p.x - 1, p.y - 1, 3, 3);
            }
        }
    }
    context.restore();
}

function renderMap() {
    mini.context.all.fillStyle = '#333';
    mini.context.all.fillRect(0, 0, count, count);
    for (var x in grid) {
        for (var y in grid[x]) {
            if (ptypes[grid[x][y].type_id].layer == 'e') {
                drawPixel(grid[x][y], mini.context.all);
            }
        }
    }
}

function drawPixel(pt, context) {
    var minipixel = context.createImageData(1, 1),
        fill = '#999',
        theme_id = pt.theme_id || ptypes[pt.type_id].theme_id;
    if (theme_id && themes[theme_id]) {
        fill = themes[theme_id].primary2;
    }
    var p = minipixel.data;
    if (fill.length == 7) {
        fill = '#' + fill.charAt(1) + fill.charAt(3) + fill.charAt(5);
    }
    var r = parseInt(fill.charAt(1), 16) * 0x11;
    var g = parseInt(fill.charAt(2), 16) * 0x11;
    var b = parseInt(fill.charAt(3), 16) * 0x11;
    p[0] = r;
    p[1] = g;
    p[2] = b;
    p[3] = 255;
    context.putImageData(minipixel, pt.x, pt.y);
}

var _tileActiveCache = {};
function getTileActive(x, y) {
    var key = x + ',' + y;
    if (!(key in _tileActiveCache)) {
        var talpha = mini.context.current.getImageData(x, y, 1, 1).data[3];
        _tileActiveCache[key] = talpha > 250; 
    }
    return _tileActiveCache[key];
}

function _getTile(x, y) {
    if (!grid[x] || !grid[x][y])
        return {'x': x, 'y': y};
    var tile = {};
    for (var key in grid[x][y]) {
        tile[key] = grid[x][y][key];
    }
    return tile;
}

function _getTiles(minx, miny, maxx, maxy) {
    var tiles = [], x, y;
    for (x = minx; x <= maxx; x++) {
        for (y = miny; y <= maxy; y++) {
            tiles.push(_getTile(x, y));
        }
    }
    return tiles;
}

function _getBuffer(x, y) {
    var bufferX = Math.floor(x / bufferScale);
    var bufferY = Math.floor(y / bufferScale);
    var buffer;
    if (!buffers[bufferX]) {
        buffers[bufferX] = {};
    }
    if (buffers[bufferX][bufferY]) {
        buffer = buffers[bufferX][bufferY];
    } else {
        buffer = buffers[bufferX][bufferY] = {
            'x': bufferX,
            'y': bufferY
        };
        buffer.canvas = document.createElement('canvas');
        buffer.canvas.width = tileSize * bufferScale;
        buffer.canvas.height = tileSize * bufferScale;
        buffer.context = buffer.canvas.getContext('2d');
    }
    return buffer;
}

function _getBuffers(viewport) {
    var minx = Math.floor(viewport.min.x / bufferScale);
    var miny = Math.floor(viewport.min.y / bufferScale);
    var maxx = Math.floor(viewport.max.x / bufferScale);
    var maxy = Math.floor(viewport.max.y / bufferScale);
    var buffers = [], x, y;
    for (x = minx; x <= maxx; x++) {
        for (y = miny; y <= maxy; y++) {
            buffers.push(_getBuffer(x * bufferScale, y * bufferScale));
        }
    }
    return buffers;
}

var _variant = {};
function _tileXY(d) {
    var ptype = ptypes[d.type_id] || unknown;
    // Simple tiles
    if (!ptype || ptype.layout_id == 'tile-1')
        return {'x': 0, 'y': 0};

    // Random alternating tiles
    if (ptype.layout_id == 'alt-4') {
        var key = d.x + ',' + d.y;
        if (!_variant[key]) {
            var dx = Math.random() < 0.5 ? 0 : 1;
            var dy = Math.random() < 0.5 ? 0 : 1;
            _variant[key] = {'x': dx, 'y': dy};
         }
         return _variant[key];
    }

    // Directional and/or animated tiles
    var isdir = ptype.layout_id.match(/dir/);
    var isanim = ptype.layout_id.match(/anim/);
    if (isdir || isanim) {
        var x = 0, y = 0;
        if (isdir) {
            y = dirIndex[d.orientation || 'u'];
        }
        if (isanim) {
            if (d.frame !== undefined) {
                x = d.frame;
            } else {
                x = ptype.frame || 0;
            }
        }
        return {'x': x, 'y': y};
    }

    // auto-16
    var l = sameLayer(_getTile(d.x - 1, d.y), d);
    var r = sameLayer(_getTile(d.x + 1, d.y), d);
    var u = sameLayer(_getTile(d.x, d.y - 1), d);
    var d = sameLayer(_getTile(d.x, d.y + 1), d);

    var tx = r + 3 * l - 2 * r * l;
    var ty = d + 3 * u - 2 * u * d;

    return {
        'x': tx,
        'y': ty
    }
}

function sameLayer(pt1, pt2) {
    var ptype1 = ptypes[pt1.type_id];
    var ptype2 = ptypes[pt2.type_id];
    if (!ptype1 || !ptype2) {
        return false;
    }
    return ptype1.layer == ptype2.layer;
}

function draw(pts) {
   pts.attr('x', function(d) {
       // var ox = noffset.attr('x');
       // return (-ox + o.w / 2 + d.x) * renderSize;
       return d.x * tileSize;
   });
   pts.attr('y', function(d) {
       // var oy = noffset.attr('y');
       // return (-oy + o.h / 2 + d.y) * renderSize;
       return d.y * tileSize;
   });
   pts.attr('tile-x', function(d) {
       return d.tileOffset.x * tileSize;
   });
   pts.attr('tile-y', function(d) {
       return d.tileOffset.y * tileSize;
   });
   pts.each(function(d) {
       var node = d3.select(this);
       var buffer = _getBuffer(d.x, d.y);
       var x = node.attr('x') - (buffer.x * tileSize * bufferScale);
       var y = node.attr('y') - (buffer.y * tileSize * bufferScale);
       var img = getSprite(d.type_id, d.theme_id);
       if (!d.tileActive) {
           buffer.context.fillStyle = '#222';
           buffer.context.fillRect(x, y, tileSize, tileSize);
           return;
       }
       buffer.context.clearRect(
           x, y, tileSize, tileSize
       );
       if (!img) {
           return;
       }
       buffer.context.drawImage(
           img,
           node.attr('tile-x'),
           node.attr('tile-y'),
           tileSize,
           tileSize,
           x,
           y,
           tileSize,
           tileSize
       );
       buffer.context.restore();
   });
}

function check(pt, ox, oy) {
   return _getTile(pt.x + ox, pt.y + oy).theme_id == ptheme.id;
}


function mouse() {
    var coords = d3.mouse(this);
    coords[0] = Math.round(coords[0] / renderSize + o.x - 0.5) - (o.w / 2);
    coords[1] = Math.round(coords[1] / renderSize + o.y - 0.5) - (o.h / 2);
    return coords;
}

function click() {
    var coords = mouse.call(this);
    var x = coords[0], y = coords[1];
    var dx = x - o.x;
    var dy = y - o.y;
    if (dx > (o.w / 2 - 3) || dx < (-o.w / 2 + 2) ||
        dy > (o.h / 2 - 3) || dy < (-o.h / 2 + 2)) {
        nav({'x': x, 'y': y}, true);
        return;
    }
    if (mode == 'play') {
        handleClick(x, y);
        return;
    }

    var d = _getTile(x, y);
    if (mode == 'playbg') {
        if (!d.type_id || d.type_id == 'p' || d.theme_id == ptheme.id || !ptypes[d.type_id])
            return;
        var c1 = check(d, -1, 0)
            c2 = check(d,  1, 0)
            c3 = check(d, 0, -1)
            c4 = check(d, 0,  1)
        if (!c1 && !c2 && !c3 && !c4) {
            if (jumps == 0)
                return;
            jumps--;
            d3.select('#jumps').text(jumps)
        }
    }
    d.pending = true;
    if (d.type_id == 'j')
        jumps++;
    score += ptypes[d.type_id].value || 0;
    if (mode == 'edit') {
        var orient = d.orientation || 'u', newOrient;
        if (d.type_id == $('#pointtype').val()) {
            for (var di in dirIndex) {
                if (dirIndex[di] == dirIndex[orient] + 1) {
                    newOrient = di;
                }
                if (dirIndex[di] == 0 && dirIndex[orient] == 3) {
                    newOrient = di;
                }
            }
        }
        d.type_id = $('#pointtype').val();
        d.theme_id = $('#theme').val();
        d.orientation = newOrient;
    } else {
        d.type_id = 'i';
        d.theme_id = ptheme.id;
    }

    var cmd = "POINT " + d.x + " " + d.y + " " + d.type_id;
    if (d.theme_id || d.orientation ) {
        cmd += " " + (d.theme_id || 0)
        if (d.orientation) {
            cmd += " " + d.orientation;
        }
    }
    d.type_id = null;
    grid[x][y] = d;
    socket.send(cmd);
}

function handleClick(x, y) {
    var dir = canFire(players[playerId], x, y, true);
    if (dir) {
        socket.send('FIRE ' + dir);
    } else {
        socket.send('GO ' + x + ' ' + y);
    }
}

function canFire(player, x, y, distant) {
    var xi = player.x; 
    var yi = player.y; 
    var dx = x - xi;
    var dy = y - yi;
    var dir, xd = 0, yd = 0;
    if (dx != 0 && dy != 0) {
         return false;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            dir = 'r';
            xd = 1;
        } else {
            dir = 'l';
            xd = -1;
        }
    } else {
        if (dy > 0) {
            dir = 'd';
            yd = 1;
        } else {
            dir = 'u';
            yd = -1;
        }
    }
    var ptype = ptypes[grid[x][y].type_id];
    if (ptype.layer == 'c') {
        return false;
    } else if (Math.abs(dx) + Math.abs(dy) != 2) {
        if (!distant && Math.abs(dx) + Math.abs(dy) > 2) {
            return false;
        }
        if (ptype.layer != 'd' && ptype.layer != 'e') {
            return false;
        }
        if (ptype.layer == 'e' && Math.abs(dx) + Math.abs(dy) == 1) {
            return false;
        }
    }
    while (xi != x - xd || yi != y - yd) {
        xi += xd;
        yi += yd;
        ptype = ptypes[grid[xi][yi].type_id];
        if (ptype.layer != 'a' && ptype.layer != 'b') {
            return false;
        }
    }
    return dir;
}

var themeImgs = {};
function themeImg(type_id, theme_id) {
    if (themeImgs[type_id + ':' + theme_id]) {
        return themeImgs[type_id + ':' + theme_id];
    }
    var img = getSprite(type_id, theme_id);
    if (!img) {
        return '';
    }
    var tcanvas = document.createElement('canvas');
    tcanvas.width = tcanvas.height = renderSize;
    var tcontext = tcanvas.getContext('2d');
    tcontext.webkitImageSmoothingEnabled = false;
    tcontext.mozImageSmoothingEnabled = false;
    tcontext.imageSmoothingEnabled = false;
    tcontext.drawImage(
        img,
        0,
        0,
        tileSize,
        tileSize,
        0,
        0,
        renderSize,
        renderSize
    );
    var data = tcanvas.toDataURL('image/png');
    themeImgs[type_id + ':' + theme_id] = data;
    return data;
}

function btnStyle(sel) {
    sel.style('cursor', 'pointer')
       .style('margin', (4 / tileSize * renderSize) + 'px')
       .style('padding', (4 / tileSize * renderSize) + 'px')
       .style('border', (4 / tileSize * renderSize) + 'px solid transparent')
       .style('border-radius', (6 / tileSize * renderSize) + 'px');
}

function updateTeams() {
    var items = panels.list.select('ul').selectAll('li.team').data(
        d3.values(teams), function(d) { return d.id }
    );
    var enter = items.enter().append('li')
       .attr('class', 'team')
    enter.append('img')
        .style('vertical-align', 'middle')
    enter.append('h3')
        .style('display', 'inline')
        .style('vertical-align', 'middle')
        .style('font-size', (renderSize * 0.8) + 'px')
        .style('margin-left', '1em');
    items.select('h3').text(function(d) {
        return d.name;
    });
    items.select('img').attr('src', function(d) {
        return themeImg('i', d.theme_id);
    });
    items.on('click', panels.list.pickTeam);
    var unusedThemes = [];
    teamThemes.forEach(function(theme_id) {
        var found = false;
        d3.values(teams).forEach(function(team) {
            if (team.theme_id == theme_id) {
                found = true;
            }
        });
        if (!found) {
            unusedThemes.push({
                'id': theme_id,
                'image': themeImg('i', theme_id)
            });
        }
    });

    var imgs = panels.edit.select('#theme-choices').selectAll('img').data(
        unusedThemes, function(d) { return d.id }
    );
    btnStyle(imgs.enter().append('img'));
    imgs.attr('src', function(d) { return d.image });
    imgs.on('click', function(d) {
        panels.edit.selected_theme = d.id;
        imgs.style('border-color', 'transparent');
        d3.select(this).style('border-color', 'white');
    });
    imgs.exit().remove();
}

function updateShips() {
    var unusedShips = [];
    ships.forEach(function(type_id) {
        var found = false;
        for (var pid in players) {
            var player = players[pid];
            if (player.team_id == panels.list.selected_team.id
                && player.type_id == type_id) {
                found = true;
            }
        }
        if (!found) {
            unusedShips.push({
                'id': type_id,
                'image': themeImg(type_id, panels.list.selected_team.theme_id)
            });
        }
    });
    imgs = panels.ship.select('#ship-choices').selectAll('img').data(
        unusedShips, function(d) { return d.id}
    );
    btnStyle(imgs.enter().append('img'))
    imgs.attr('src', function(d) { return d.image });
    imgs.on('click', function(d) {
        panels.ship.selected_ship = d.id;
        imgs.style('border-color', 'transparent');
        d3.select(this).style('border-color', 'white');
    });
    imgs.exit().remove();
}

var messageVisible = false;
function showMessage(msg) {
    if (messageVisible) {
         setTimeout(function() {
             showMessage(msg);
         }, 5000);
    }
    messageVisible = true;
    d3.select("#message")
        .text(msg)
        .style('display', 'block');
    setTimeout(function() {
        messageVisible = false;
        d3.select('#message').style('display', 'none');
    }, 5000)
}

};

});
