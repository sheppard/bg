#!/usr/bin/env python3

import asyncio
import websockets
from game.run import Game


game = Game()

@asyncio.coroutine
def handler(ws, path):
    player = yield from game.new_player(ws)
    while True:
       if not ws.open:
           yield from game.remove_player(player)
           return
       recv = asyncio.async(ws.recv())
       tick = asyncio.async(game.tick())
       done, pending = yield from asyncio.wait(
           [recv, tick], return_when=asyncio.FIRST_COMPLETED
       )

       if recv in done:
           yield from game.process(recv.result())
       else:
           recv.cancel()

       if tick not in done:
           tick.cancel()

server = websockets.serve(handler, '0.0.0.0', 10234)
asyncio.get_event_loop().run_until_complete(server)
asyncio.get_event_loop().run_forever()
