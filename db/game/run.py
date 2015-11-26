#!/usr/bin/env python3

import asyncio
from grid.util import make_level
# from grid.models import Point
import random
from dijkstar import Graph, find_path, NoPathError

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

    def __init__(self, client, game):
        self.client = client
        self.game = game
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
        if self.target_x == tx and self.target_y == ty:
            return False
        lx, ly = self.x, self.y
        self.plan = {}
        path = self.game.find_path((lx, ly), (tx, ty))
        if path:
            self.target_x, self.target_y = path[-1]
        for step in path:
            self.plan[frame] = step
            frame += 1
            frame = frame % 1000
        return True

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
        self.graph = Graph()

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

        for pt in self.all_points:
            if pt.type_id == 'p':
                continue
            neighbors = []
            if pt.x > 0:
                neighbors.append(self.level[pt.y][pt.x - 1])
            if pt.x < self.width - 1:
                neighbors.append(self.level[pt.y][pt.x + 1])
            if pt.y > 0:
                neighbors.append(self.level[pt.y - 1][pt.x])
            if pt.y < self.height + 1:
                neighbors.append(self.level[pt.y + 1][pt.x])
            for npt in neighbors:
                self.graph.add_edge((npt.x, npt.y), (pt.x, pt.y), 1)

    def find_path(self, pt1, pt2):
        def manhattan(u, v, edge, prev_edge):
            return abs(u[0] - v[0]) + abs(u[1] - v[1])
        try:
            nodes, edges, costs, final_cost = find_path(
                self.graph, pt1, pt2, heuristic_func=manhattan
            )
            result = []
            f = self.frame
            for i, (x, y) in enumerate(nodes):
                if f > self.frame and self.check_conflict(f, x, y):
                    if self.check_conflict((f + 1) % 1000, x, y):
                        return result
                    else:
                        result.append(result[-1])
                        f += 1
                result.append((x, y))
                f += 1
            return result
        except NoPathError:
            return []

    def check_conflict(self, frame, x, y):
        for player in self.players:
            if not player.plan:
                if player.x == x and player.y == y:
                    return True
                else:
                    continue

            if frame in player.plan:
                if player.plan[frame] == (x, y):
                    return True

            elif player.target_x == x and player.target_y == y:
                return True

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
        if player.set_target(self.frame, int(x), int(y)):
            yield from self.broadcast(player.path_str(self.frame))

    @asyncio.coroutine
    def broadcast(self, msg):
        print(msg)
        for player in self.players:
            print("Sending to Player ", player.id)
            yield from player.client.send(msg)

    @asyncio.coroutine
    def new_player(self, client):
        player = Player(client, self)
        while player.x is None or self.level[player.y][player.x].type_id == 'p':
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
            yield from player.client.send(pl.path_str(self.frame))
        yield from self.broadcast(player.to_str())
