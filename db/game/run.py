import asyncio
from grid.util import make_level
import random
from dijkstar import Graph, find_path, NoPathError
from wq.io import JsonNetIO
import os
import string

def random_string(length):
    chars = ''
    for i in range(length):
        chars += random.choice(
            string.ascii_uppercase
        )
    return chars


class PointTypeIO(JsonNetIO):
    url = "http://%s/pointtypes.json" % os.environ['BG_HOST']
    namespace = "list"

class ThemeIO(JsonNetIO):
    url = "http://%s/themes.json" % os.environ['BG_HOST']
    namespace = "list"

ptypes = {}
for ptype in PointTypeIO():
    ptypes[ptype.code] = ptype


themes = {}
for theme in ThemeIO():
    themes[theme.code] = theme


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


class Team(object):
    count = 0

    def __init__(self, game, name, theme_id):
        self.game = game
        self.name = name
        self.theme_id = theme_id
        Team.count += 1
        self.id = Team.count
        self.players = set()
        self.starts = set()
        self.score = 0
        self.score_message = False

    def to_str(self):
        return "TEAM %s %s %s %s" % (
            self.id, self.name.replace(' ', '_'), self.theme_id, self.score
        )

    def score_str(self):
        return "SCORE %s %s" % (self.id, self.score)

    def add_player(self, player):
        self.players.add(player)

    @asyncio.coroutine
    def add_score(self, score):
        self.score += score
        yield from self.game.broadcast(self.score_str())
        if self.score >= len(self.players) * 10000 and not self.score_message:
            self.score_message = True
            yield from self.game.broadcast(
                "MESSAGE Team %s achieved a score of %s" %
                (self.name or self.id, self.score)
            )

class Player(object):
    active = False
    count = 0

    x = None
    y = None
    name = None
    hp = 0
    lives = 0
    type_id = None
    target_x = None
    target_y = None
    team = None
    plan = {}

    def __init__(self, client, game):
        self.client = client
        self.game = game
        Player.count += 1
        self.id = Player.count

    @asyncio.coroutine
    def send(self, message):
        if self.client.open:
            yield from self.client.send(message)

    @property
    def theme_id(self):
        return self.team and self.team.theme_id

    def to_str(self, assign=False):
        res = "PLAYER %s %s %s %s %s %s %s %s" % (
            self.id, self.team.id, self.name, self.type_id,
            self.x, self.y, self.lives, self.hp
        )
        if assign:
            res += " 1"
        return res

    def path_str(self, frame):
        plan = self.get_plan(frame)
        s = "PATH %s" % self.id
        for f, (x, y) in enumerate(plan):
            s += " %s:%s,%s" % ((frame + f) % 1000, x, y)
        return s

    def hp_str(self):
        return "HP %s %s" % (self.id, self.hp)

    def lives_str(self):
        return "LIVES %s %s" % (self.id, self.lives)

    @asyncio.coroutine
    def game_over(self):
        yield from self.game.broadcast(self.hp_str())
        yield from self.game.broadcast(self.lives_str())
        yield from self.game.broadcast("GAMEOVER %s" % self.id)
        self.active = False
        self.x = -1000
        self.y = -1000

    @asyncio.coroutine
    def add_hp(self, hp):
        self.hp += hp
        if self.hp == 0:
            self.lives -= 1
            yield from self.game.process_point(
                self, self.x, self.y, self.type_id, '金'
            )
            if self.lives == 0:
                yield from self.game_over()
            else:
                self.hp = 10
                self.game.locate_player(self)
                yield from self.game.broadcast(self.to_str())
                yield from self.send(self.to_str(True))
        yield from self.game.broadcast(self.hp_str())

    @asyncio.coroutine
    def tick(self, frame):
        if not self.active:
            return
        self.x, self.y = self.get_plan(frame)[0]
        if self.x == self.target_x and self.y == self.target_y:
            self.plan = {}
            self.target_x = None
            self.target_y = None
        pt = self.game.level[self.y][self.x]
        ptype = ptypes[pt.type_id]
        if ptype.layer == 'c' and ptype.replace_with_id:
            yield from self.team.add_score(ptype.value)
            if pt.type_id == 'j':
                yield from self.add_hp(1)
            yield from self.game.process_point(
                self, self.x, self.y, ptype.replace_with_id, self.theme_id,
            )
        elif pt.type_id == 'X' and pt.theme_id == '金':
            self.team.starts.add(pt)
            yield from self.team.add_score(500)
            for x in range(self.x - 2, self.x + 3):
               for y in range(self.y - 2, self.y + 3):
                   pt = self.game.level[y][x]
                   yield from self.game.process_point(
                       self, pt.x, pt.y, pt.type_id, self.theme_id, pt.orientation
                   )
        elif pt.type_id in ('iwX') and frame % 50 == 0:
            if pt.theme_id == self.theme_id and self.hp < 10:
                yield from self.add_hp(1)
            elif pt.theme_id not in (self.theme_id, '金'):
                yield from self.add_hp(-1)

    def set_target(self, frame, tx, ty):
        if self.target_x == tx and self.target_y == ty:
            return False
        lx, ly = self.x, self.y
        lpt = self.game.level[ly][lx]
        tpt = self.game.level[ty][tx]
        if lpt.type_id == 'X' and tpt.type_id == 'X' and lpt.theme_id == self.theme_id and tpt.theme_id == self.theme_id:
            path = [(lx, ly), (tx, ty)]
        else:

            path = self.game.find_path((lx, ly), (tx, ty))
        self.plan = {}
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

class Projectile(object):
    x = None
    y = None
    direction = None
    type_id = None
    theme_id = None
    target_x = None
    target_y = None
    plan = {}
    game = None
    countdown = None

    def __init__(self, player, direction, game):
        self.player = player
        self.direction = direction
        self.game = game
        self.x = player.x
        self.y = player.y
        self.set_target(game.frame)
        self.id = "%s-%s" % (player.id, random_string(3))
        self.type_id = 'r'
        self.theme_id = player.theme_id

    def to_str(self):
        return "PROJECTILE %s %s %s %s %s %s" % (
            self.id, self.type_id, self.x, self.y, self.direction,
            'x' if self.destroy else 'v'
        )

    def path_str(self, frame):
        plan = self.get_plan(frame)
        s = "PATH %s" % self.id
        for f, (x, y) in enumerate(plan):
             s += " %s:%s,%s" % ((frame + f) % 1000, x, y)
        return s

    @asyncio.coroutine
    def tick(self, frame):
        self.x, self.y = self.get_plan(frame)[0]
        if self.x != self.target_x or self.y != self.target_y:
            return
        if self.countdown is None:
            self.countdown = 2
        self.countdown -= 1
        if self.countdown == 0:
            ptype = ptypes[self.game.level[self.y][self.x].type_id]
            if self.destroy and ptype.replace_with_id:
                yield from self.game.process_point(
                    self, self.x, self.y, ptype.replace_with_id, self.theme_id,
                )
            yield from self.game.remove_projectile(self)

    def set_target(self, frame):
        self.plan = {}
        path, destroy = self.game.find_line(self.x, self.y, self.direction)
        if path:
            self.target_x, self.target_y = path[-1]
        for step in path:
            self.plan[frame] = step
            frame += 1
            frame = frame % 1000
        self.destroy = destroy

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
        self.teams = set()
        self.players = set()
        self.projectiles = set()
        self.graph = Graph()
        self.starts = set()

        for y in range(0, self.height):
            row = []
            for x in range(0, self.width):
                type_id = level_str[y * (self.width + 1) + x]
                row.append(Point(
                    x=x,
                    y=y,
                    type_id=type_id,
                    theme_id=('金' if type_id in 'iwX' else None),
                    orientation=None
                ))
            self.level.append(row)

        for pt in self.all_points:
            if pt.type_id == 'X':
                self.starts.add(pt)
            self.set_node(pt)

    def set_node(self, pt):
        ptype = ptypes[pt.type_id]
        if ptype.layer == 'e':
            cost = 50
        elif ptype.layer == 'd':
            cost = 6
        elif ptype.layer == 'c':
            cost = 0.99
        else:
            cost = 1
        neighbors = []
        if pt.x > 0:
            neighbors.append(self.level[pt.y][pt.x - 1])
        if pt.x < self.width - 1:
            neighbors.append(self.level[pt.y][pt.x + 1])
        if pt.y > 0:
            neighbors.append(self.level[pt.y - 1][pt.x])
        if pt.y < self.height - 1:
            neighbors.append(self.level[pt.y + 1][pt.x])
        for npt in neighbors:
            self.graph.add_edge((npt.x, npt.y), (pt.x, pt.y), cost)

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
                ptype = ptypes[self.level[y][x].type_id]
                if ptype.layer in ('d', 'e'):
                    return result
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

    def find_line(self, x, y, direction):
        path = []
        layer = None
        destroy = False
        while not layer or layer not in ('c', 'd', 'e'):
            path.append((x, y))
            if direction == 'l':
                x -= 1
            if direction == 'r':
                x += 1
            if direction == 'u':
                y -= 1
            if direction == 'd':
                y += 1
            layer = ptypes[self.level[y][x].type_id].layer
        if layer in ('c', 'd'):
            path.append((x, y))
            destroy = True
        return path, destroy

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
        for player in list(self.players):
            yield from player.tick(self.frame)
            for proj in list(self.projectiles):
                yield from self.check_collide(proj, player)
        for proj in list(self.projectiles):
            yield from proj.tick(self.frame)
            for proj2 in list(self.projectiles):
                yield from self.check_collide(proj2, proj)
            for player in list(self.players):
                yield from self.check_collide(proj, player)

    @asyncio.coroutine
    def check_collide(self, proj, obj):
        if proj.x != obj.x or proj.y != obj.y or proj.id == obj.id:
            return
        if isinstance(obj, Player) and proj.player.id == obj.id:
            return
        yield from self.remove_projectile(proj)
        if isinstance(obj, Projectile):
            yield from self.remove_projectile(obj)
        else:
            yield from obj.add_hp(-1)

    @asyncio.coroutine
    def process(self, player, data):
        if not data:
            return
        vals = data.split(" ")
        cmd, args = vals[0], vals[1:]
        fn = getattr(self, 'process_%s' % cmd.lower(), None)
        if fn:
            yield from fn(player, *args)

    @asyncio.coroutine
    def process_point(self, player, x, y, type_id, theme_id=None, orientation=None):
        pt = self.level[int(y)][int(x)]
        pt.type_id = type_id
        pt.theme_id = theme_id
        pt.orientation = orientation
        self.set_node(pt)
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
            yield from player.send(msg)

    @asyncio.coroutine
    def new_player(self, client):
        player = Player(client, self)
        self.players.add(player)

        tstr = "THEMES"
        for theme_id, theme in themes.items():
            if not theme.elemental:
                tstr += " %s" % theme_id
        yield from player.send(tstr)

        sstr = "SHIPS"
        for type_id, ptype in ptypes.items():
            if type_id.isdigit():
                sstr += " %s" % type_id
        yield from player.send(sstr)

        for team in self.teams:
            yield from player.send(team.to_str())

        for pl in self.players:
            if not pl.active:
                continue
            yield from player.send(pl.to_str())

        return player

    def start_player(self, player):
        player.active = True
        self.locate_player(player, initial=True)
        player.hp = 10
        player.lives = 3
        yield from self.send_initial(player)

    def locate_player(self, player, initial=False):
        if not initial:
            tx = player.x
            ty = player.y
            choices = player.team.starts
        else:
            if len(player.team.starts) == 0:
                ty = 0
                if player.team.id == 1:
                    tx = 0
                elif player.team.id == 2:
                    tx = self.width
                elif player.team.id == 3:
                    tx = self.width / 2
                else:
                    tx = random.randint(0, self.width)
            else:
                tx = 0
                ty = 0
                for start in player.team.starts:
                    tx += start.x
                    ty += start.y
                tx /= len(player.team.starts)
                ty /= len(player.team.starts)

            choices = []
            for i in range(0, int(len(self.starts) / 2)):
                start = None
                while start is None or start.theme_id != '金':
                    start = random.choice(list(self.starts))
                choices.append(start)
        choices = sorted(
            choices,
            key=lambda pt: abs(pt.x - tx) + abs(pt.y - ty)
        )
        player.x = choices[0].x
        player.y = choices[0].y

    @asyncio.coroutine
    def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)

    @asyncio.coroutine
    def process_fire(self, player, direction):
        proj = Projectile(player, direction, self)
        self.projectiles.add(proj)
        yield from self.broadcast(proj.to_str())
        yield from self.broadcast(proj.path_str(self.frame))

    @asyncio.coroutine
    def process_team(self, player, name, theme_id):
        for team in self.teams:
            if team.theme_id == theme_id:
                return
        team = Team(self, name, theme_id)
        self.teams.add(team)
        yield from self.broadcast(team.to_str())

    @asyncio.coroutine
    def process_join(self, player, team_id):
        for team in self.teams:
            if str(team.id) == team_id:
                team.add_player(player)
                player.team = team

        if not player.team:
            raise Exception("Failed to find team")

    @asyncio.coroutine
    def process_ship(self, player, ship_id, name):
        player.type_id = ship_id
        player.name = name
        yield from self.start_player(player)

    @asyncio.coroutine
    def remove_projectile(self, projectile):
        if projectile in self.projectiles:
            self.projectiles.remove(projectile)

    @asyncio.coroutine
    def send_initial(self, player):
        yield from player.send(self.to_str())
        yield from player.send(player.to_str(True))
        yield from player.send("TICK %s" % self.frame)
        for pt in self.all_points:
            if pt.theme_id or pt.orientation:
                 yield from player.send(pt.to_str())
        for pl in self.players:
            if not pl.active:
                continue
            yield from player.send(pl.path_str(self.frame))
        yield from self.broadcast(player.to_str())
