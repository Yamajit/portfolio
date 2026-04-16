
content = open(r'c:\Users\vstni\.gemini\antigravity\scratch\gaming-website\index.html', encoding='utf-8').read()

checks = [
    ('23 Free Browser Games', '23 in hero subtitle'),
    ('data-target="23"', '23 in stat counter'),
    ('card-meteor-rain', 'Meteor Rain card'),
    ('card-tank-blitz', 'Tank Blitz card'),
    ('card-whack-a-mole', 'Whack-A-Mole card'),
    ('card-reaction-time', 'Reaction Time card'),
    ('card-game-2048', '2048 card'),
    ("launchGame('meteor-rain')", 'Meteor Rain play button'),
    ("launchGame('tank-blitz')", 'Tank Blitz play button'),
    ("launchGame('whack-a-mole')", 'Whack-A-Mole play button'),
    ("launchGame('reaction-time')", 'Reaction Time play button'),
    ("launchGame('game-2048')", '2048 play button'),
    ('Meteor Rain', 'Meteor Rain card title'),
    ('Tank Blitz', 'Tank Blitz card title'),
    ('Whack-A-Mole', 'Whack-A-Mole card title'),
    ('Reaction Time', 'Reaction Time card title'),
    ('2048', '2048 card title'),
]

all_ok = True
for needle, label in checks:
    status = 'OK' if needle in content else 'FAIL'
    if status == 'FAIL':
        all_ok = False
    print(f'[{status}] {label}')

print(f'Total file size: {len(content)} chars')
print(f'All checks passed: {all_ok}')
