#!/usr/bin/env python3

import asyncio
import websockets
from game.run import Game


game = Game()

@asyncio.coroutine
def tick():
    while True:
        yield from game.tick()

@asyncio.coroutine
def handler(ws, path):
    player = yield from game.new_player(ws)
    while True:
       if not ws.open:
           yield from game.remove_player(player)
           return
       msg = yield from ws.recv()
       yield from game.process(player, msg)

server = websockets.serve(handler, '0.0.0.0', 10234)
asyncio.get_event_loop().run_until_complete(
    asyncio.gather(server, tick())
)
