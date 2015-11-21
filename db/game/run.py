#!/usr/bin/env python3

import asyncio
from grid.util import make_level
# from grid.models import Point

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
    def __init__(self, client):
        self.client = client


class Game(object):
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
        yield from asyncio.sleep(10)
        return "TEST"

    @asyncio.coroutine
    def process(self, data):
        if not data:
            return
        vals = data.split(" ")
        cmd, args = vals[0], vals[1:]
        if cmd != "POINT":
            return

        yield from self.process_point(*args)

    @asyncio.coroutine
    def process_point(self, x, y, type_id, theme_id=None, orientation=None):
        pt = self.level[int(y)][int(x)]
        pt.type_id = type_id
        pt.theme_id = theme_id
        pt.orientation = orientation
        yield from self.send_point(pt)

    @asyncio.coroutine
    def send_point(self, pt):
        print(pt.to_str())
        for player in self.players:
            print("Sending to", player)
            yield from player.client.send(pt.to_str())

    @asyncio.coroutine
    def new_player(self, client):
        player = Player(client)
        self.players.add(player)
        yield from self.send_initial(player)
        return player

    @asyncio.coroutine
    def remove_player(self, player):
        self.players.remove(player)

    @asyncio.coroutine
    def send_initial(self, player):
        yield from player.client.send(self.to_str())
        for pt in self.all_points:
            if pt.theme_id or pt.orientation:
                 yield from player.client.send(pt.to_str())
