import re

FILE = r"c:\Users\vstni\.gemini\antigravity\scratch\gaming-website\index.html"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Define new game cards to insert
METEOR_RAIN_CARD = '''                    <!-- Meteor Rain -->
                    <div class="game-card game-card--new" id="card-meteor-rain" data-category="runner" data-game="meteor-rain">
                        <div class="card-glow" style="background: radial-gradient(circle, #ff6644 0%, transparent 70%);"></div>
                        <div class="card-icon">&#9732;&#65039;</div>
                        <div class="card-badge runner">Runner</div>
                        <div class="card-badge-new">NEW</div>
                        <h3 class="card-title">Meteor Rain</h3>
                        <p class="card-desc">Pilot your neon ship through a devastating meteor shower. Dodge left &amp; right &mdash; how long can you survive?</p>
                        <div class="card-meta">
                            <span class="meta-perspective">&#9732; Dodge</span>
                            <span class="meta-keys">&#8592; &#8594; / A D</span>
                        </div>
                        <button class="play-btn" onclick="launchGame('meteor-rain')">
                            <span>PLAY</span><span class="play-arrow">&#9654;</span>
                        </button>
                    </div>\r\n'''

TANK_BLITZ_CARD = '''                    <!-- Tank Blitz -->
                    <div class="game-card game-card--new" id="card-tank-blitz" data-category="action" data-game="tank-blitz">
                        <div class="card-glow" style="background: radial-gradient(circle, #00ff88 0%, transparent 70%);"></div>
                        <div class="card-icon">&#128269;</div>
                        <div class="card-badge action">Action</div>
                        <div class="card-badge-new">NEW</div>
                        <h3 class="card-title">Tank Blitz</h3>
                        <p class="card-desc">Command your neon tank! Rotate, charge forward, and blast waves of enemy tanks before they destroy you!</p>
                        <div class="card-meta">
                            <span class="meta-perspective">&#127918; Top-Down</span>
                            <span class="meta-keys">&#8328; WASD + Space</span>
                        </div>
                        <button class="play-btn" onclick="launchGame('tank-blitz')">
                            <span>PLAY</span><span class="play-arrow">&#9654;</span>
                        </button>
                    </div>\r\n'''

WHACK_CARD = '''                    <!-- Whack-A-Mole -->
                    <div class="game-card game-card--new" id="card-whack-a-mole" data-category="arcade" data-game="whack-a-mole">
                        <div class="card-glow" style="background: radial-gradient(circle, #a16207 0%, transparent 70%);"></div>
                        <div class="card-icon">&#128296;</div>
                        <div class="card-badge arcade">Arcade</div>
                        <div class="card-badge-new">NEW</div>
                        <h3 class="card-title">Whack-A-Mole</h3>
                        <p class="card-desc">Moles pop up &mdash; smash them before they hide! 60 seconds on the clock. How many can you whack?</p>
                        <div class="card-meta">
                            <span class="meta-perspective">&#128296; Smash!</span>
                            <span class="meta-keys">&#128433; Click / Tap</span>
                        </div>
                        <button class="play-btn" onclick="launchGame('whack-a-mole')">
                            <span>PLAY</span><span class="play-arrow">&#9654;</span>
                        </button>
                    </div>\r\n'''

REACTION_CARD = '''                    <!-- Reaction Time -->
                    <div class="game-card game-card--new" id="card-reaction-time" data-category="skill" data-game="reaction-time">
                        <div class="card-glow" style="background: radial-gradient(circle, #00d4ff 0%, transparent 70%);"></div>
                        <div class="card-icon">&#9201;&#65039;</div>
                        <div class="card-badge skill">Skill</div>
                        <div class="card-badge-new">NEW</div>
                        <h3 class="card-title">Reaction Time</h3>
                        <p class="card-desc">When the circle turns GREEN &mdash; click as fast as you can! 10 rounds. Average your time and beat your best!</p>
                        <div class="card-meta">
                            <span class="meta-perspective">&#9889; Reflex</span>
                            <span class="meta-keys">&#128433; Click / Space</span>
                        </div>
                        <button class="play-btn" onclick="launchGame('reaction-time')">
                            <span>PLAY</span><span class="play-arrow">&#9654;</span>
                        </button>
                    </div>\r\n'''

GAME_2048_CARD = '''                    <!-- 2048 -->
                    <div class="game-card game-card--new" id="card-game-2048" data-category="puzzle" data-game="game-2048">
                        <div class="card-glow" style="background: radial-gradient(circle, #edc22e 0%, transparent 70%);"></div>
                        <div class="card-icon">&#128290;</div>
                        <div class="card-badge puzzle">Puzzle</div>
                        <div class="card-badge-new">NEW</div>
                        <h3 class="card-title">2048</h3>
                        <p class="card-desc">Merge tiles to reach 2048! Slide numbered tiles together &mdash; same numbers combine. Think ahead to win!</p>
                        <div class="card-meta">
                            <span class="meta-perspective">&#128290; Merge</span>
                            <span class="meta-keys">&#8328; Arrow Keys</span>
                        </div>
                        <button class="play-btn" onclick="launchGame('game-2048')">
                            <span>PLAY</span><span class="play-arrow">&#9654;</span>
                        </button>
                    </div>\r\n'''

# Helper to insert a card block before the closing </div></div></div> at end of category
# We find the LAST occurrence of launchGame for each game, then find the closing </button></div> 
# after it, and then the next 3 </div> closing tags

def insert_after_game(content, trigger_game, new_card_html):
    """Find the launchGame(trigger_game) button, locate the 3 closing divs after the card, inject before them."""
    pattern = rf"(launchGame\('{re.escape(trigger_game)}'\).*?</button>\r?\n\s+</div>)(\r?\n\s+</div>\r?\n\s+</div>)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        insert_pos = match.end(1)
        content = content[:insert_pos] + '\r\n' + new_card_html + content[match.start(2):]
        print(f"  Inserted card after {trigger_game} at position {insert_pos}")
    else:
        print(f"  WARNING: Could not find anchor for {trigger_game}")
        # Try fallback
        idx = content.find(f"launchGame('{trigger_game}')")
        print(f"  Fallback: found '{trigger_game}' at index {idx}")
    return content

print("Starting insertions...")

# Runners: after color-road
content = insert_after_game(content, 'color-road', METEOR_RAIN_CARD)

# Action: after laser-defense
content = insert_after_game(content, 'laser-defense', TANK_BLITZ_CARD)

# Arcade: after fruit-catcher
content = insert_after_game(content, 'fruit-catcher', WHACK_CARD)

# Skill: after aim-trainer
content = insert_after_game(content, 'aim-trainer', REACTION_CARD)

# Puzzle: after tile-slide
content = insert_after_game(content, 'tile-slide', GAME_2048_CARD)

# Write back
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! Verifying...")
for game_id in ['meteor-rain', 'tank-blitz', 'whack-a-mole', 'reaction-time', 'game-2048']:
    if game_id in content:
        print(f"  {game_id}: PRESENT")
    else:
        print(f"  {game_id}: MISSING!")
