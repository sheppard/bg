import random

def make_level():
    level = ''
    count = 128
    #types: b j g d

    def random_item():
        t = 'b'
        if random.random() > 0.7:
            t = 'c'
        if random.random() > 0.8:
            t = 's'
            if random.random() > 0.7:
               t = 'g'
               if random.random() > 0.7:
                   t = 'd'
        
        if random.random() > 0.99:
            t = 'j'

        if random.random() > 0.999:
            t = 't'
        return t

    for y in range(0, count):
        for x in range(0, count):
            t = 'b'
            if x == 0 or y == 0 or x == count-1 or y == count-1:
                t = 'p'
            elif x % 2 == 0 and y % 2 == 0 and random.random() > 0.2:
                t = 'p'
            elif (x % 2 == 0 or y % 2 == 0) and random.random() > 0.7:
                t = 'p'
            elif random.random() > 0.99:
                t = 'p'

            if t == 'b':
                t = random_item()

            level += t
        level += '\n'

    return level
