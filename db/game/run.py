#!/usr/bin/env python3

import asyncio
from grid.util import make_level
# from grid.models import Point
import random

class Point(object):
    x = None
    y = None
    type_id = None
    theme_id = None
    orientation = None

    def __init__(self, **kwargs):
        self.__dict__.update(**kwargs)

    def to_str(self):
        s = "POINT %s %s %s" % (
            self.x,
            self.y,
            self.type_id,
        )
        if self.theme_id or self.orientation:
            s += " " + self.theme_id or "0"
        if self.orientation:
            s += " " + self.orientation
        return s


class Player(object):
    count = 0

    x = None
    y = None
    type_id = None
    theme_id = None
    target_x = None
    target_y = None
    plan = {}

    def __init__(self, client):
        self.client = client
        Player.count += 1
        self.id = Player.count
        self.type_id = self.id % 5
        self.theme_id = self.id % 5

    def to_str(self):
        return "PLAYER %s %s %s %s %s" % (
            self.id, self.theme_id, self.type_id, self.x, self.y
        )

    def path_str(self, frame):
        plan = self.get_plan(frame)
        s = "PATH %s" % self.id
        for f, (x, y) in enumerate(plan):
             s += " %s:%s,%s" % ((frame + f) % 1000, x, y)
        return s

    def tick(self, frame):
        self.x, self.y = self.get_plan(frame)[0]
        if self.x == self.target_x and self.y == self.target_y:
            self.plan = {}
            self.target_x = None
            self.target_y = None

    def set_target(self, frame, tx, ty):
        self.target_x = tx
        self.target_y = ty
        lx, ly = self.x, self.y
        self.plan = {}
        self.plan[frame] = lx, ly
        while lx != tx or ly != ty:
            frame += 1
            frame = frame % 1000
            if abs(tx - lx) > abs(ty - ly):
                if tx > lx:
                    lx += 1
                elif tx < lx:
                    lx -= 1
            else:
                if ty > ly:
                    ly += 1
                elif ty < ly:
                    ly -= 1
            self.plan[frame] = lx, ly

    def get_plan(self, frame):
        if not self.plan or frame not in self.plan:
            return [(self.x, self.y)]
        plan = []
        f = frame
        while f in self.plan:
            plan.append(self.plan[f])
            f += 1
            f = f % 1000
        return plan


class Game(object):
    frame = 0
    sync_frame = 0

    def __init__(self):
        level_str = make_level()

        self.width = level_str.index('\n')
        self.height = level_str.count('\n')
        self.level = []
        self.players = set()

        for y in range(0, self.height):
            row = []
            for x in range(0, self.width):
                type_id = level_str[y * (self.width + 1) + x]
                row.append(Point(
                    x=x,
                    y=y,
                    type_id=type_id,
                    theme_id=None,
                    orientation=None
                ))
            self.level.append(row)

    def to_str(self):
        s = 'GRID '
        for row in self.level:
           for pt in row:
               s += pt.type_id
           s += '\n'
        return s

    @property
    def all_points(self):
        for row in self.level:
           for c in row:
               yield c

    @asyncio.coroutine
    def tick(self):
        yield from asyncio.sleep(0.1)
        self.frame += 1
        self.frame = self.frame % 1000
        if self.frame % 100 == 0:
            self.sync_frame += 1
            if self.sync_frame == 1:
                self.sync_frame = 0
                yield from self.broadcast("TICK %s" % self.frame)
        for player in self.players:
            player.tick(self.frame)

    @asyncio.coroutine
    def process(self, player, data):
        if not data:
            return
        vals = data.split(" ")
        cmd, args = vals[0], vals[1:]
        if cmd == "POINT":
            yield from self.process_point(player, *args)
        elif cmd == "GO":
            yield from self.process_go(player, *args)

    @asyncio.coroutine
    def process_point(self, player, x, y, type_id, theme_id=None, orientation=None):
        pt = self.level[int(y)][int(x)]
        pt.type_id = type_id
        pt.theme_id = theme_id
        pt.orientation = orientation
        yield from self.broadcast(pt.to_str())

    @asyncio.coroutine
    def process_go(self, player, x, y):
        player.set_target(self.frame, int(x), int(y))
        yield from self.broadcast(player.path_str(self.frame))

    @asyncio.coroutine
    def broadcast(self, msg):
        print(msg)
        for player in self.players:
            print("Sending to Player ", player.id)
            yield from player.client.send(msg)

    @asyncio.coroutine
    def new_player(self, client):
        player = Player(client)
        while player.x is None or self.level[player.x][player.y].type_id == 'p':
            player.x = random.randint(0, self.width - 1)
            player.y = random.randint(0, self.height - 1)
        self.players.add(player)
        yield from self.send_initial(player)
        return player

    @asyncio.coroutine
    def remove_player(self, player):
        self.players.remove(player)

    @asyncio.coroutine
    def send_initial(self, player):
        yield from player.client.send(self.to_str())
        yield from player.client.send(player.to_str() + " 1")
        yield from player.client.send("TICK %s" % self.frame)
        for pt in self.all_points:
            if pt.theme_id or pt.orientation:
                 yield from player.client.send(pt.to_str())
        for pl in self.players:
            yield from player.client.send(pl.to_str())
        yield from self.broadcast(player.to_str())
