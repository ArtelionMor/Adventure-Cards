"""Rewrite row 4 of the TLE intention CSV (v(4) layout, 184 columns) with
column-by-column explanations. Idempotent: overwrites the existing row 4
without inserting a new one.
"""
import csv

SRC = "V3.2 SA - TLE intention(4).csv"
DST = "V3.2 SA - TLE intention(4).csv"

with open(SRC, newline="") as f:
    rows = list(csv.reader(f))

NCOL = max(len(r) for r in rows[:6])
exp = [""] * NCOL

ord_suffix = lambda n: "st" if n == 1 else "nd" if n == 2 else "rd" if n == 3 else "th"

# --- Parameters left block (cols 0-2) ---
exp[0] = "Tuning parameter name (left-hand list of global knobs that drive the Gauge / Difficulty / Reward formulas for every TLE)"
exp[1] = "Value used by the formulas for the parameter on its left (only the cells in this column are read by the generator)"

# --- Event metadata (cols 3-7) ---
exp[3] = "Display name of the TLE event configured by this row (one row = one event setup, e.g. 'TLE 1 Meadow' for an Island Trial, 'TLE 2 Meadow' for an Island Odyssey)"
exp[4] = "TRUE = (re)generate the WorldProgress / reward gauge for this event ; FALSE = reuse the existing one"
exp[5] = "How the gauge total reward is split across milestones. A single number (e.g. 4) = that many equal gauge milestones per world. A dash list (e.g. '4 - 2 - 4 - 3 - 5') = gauge milestones + leaderboard tier split"
exp[6] = "TRUE = this event has a competitive leaderboard on top of the gauge (Island Odyssey) ; FALSE = gauge only (Island Trial)"

# --- Per-world gauge curves (cols 8-34) ---
for i, w in zip(range(8, 13), range(1, 6)):
    exp[i] = f"alpha curve for the HC reward distribution in World {w}. Used by the formula y = y_start + (y_end - y_start) * t^(1/alpha) where t is the normalised milestone progress. alpha > 1 = front-loaded (curve climbs fast early), alpha < 1 = back-loaded (long grind near the end)"

for i, w in zip(range(13, 18), range(1, 6)):
    exp[i] = f"Total amount of HC handed out by the gauge in World {w} (sum of HC across all gauge milestones for that world)"

for i, w in zip(range(19, 24), range(1, 6)):
    exp[i] = f"alpha curve for the XP gauge in World {w} (same role as the HC alpha but applied to the XP progression curve)"

for i, w in zip(range(24, 29), range(1, 6)):
    exp[i] = f"Total amount of XP required to fill the gauge in World {w}"

for i, w in zip(range(30, 35), range(1, 6)):
    exp[i] = f"XP multiplier applied on top of the base XP rewards in World {w} (1 = no boost, 2 = x2, etc. Doubling per world is a common pattern: 1, 2, 4, 8, 16)"

# --- Reward / Leaderboard totals & curve inputs (cols 36-40) ---
exp[36] = "Sum of the gem-equivalent value of all gauge rewards listed on this row (sanity check vs the gauge HC budget)"
exp[37] = "Sum of the gem-equivalent value of all leaderboard rewards listed on this row (only filled when Leaderboard ? = TRUE)"
exp[38] = "Total XP cap used as the upper bound of the leaderboard XP curve. Plays the role of y_end in the alpha-XP formula when computing the cumulative target of each leaderboard tier"
exp[39] = "alpha used to distribute the reward VALUE across the 20 leaderboard tiers. Smaller alpha = earlier tiers carry less value, late tiers concentrate the payout (back-loaded). Larger alpha = the opposite (front-loaded leaderboard payout)"
exp[40] = "alpha used to distribute the cumulative XP TARGETS across the 20 leaderboard tiers. Smaller alpha = early tiers are cheap, top tiers require a huge XP grind. Larger alpha = the climb is steeper at the start, milder at the top"

# --- Leaderboard reward items 1-20 (cols 41-60) ---
for i, n in zip(range(41, 61), range(1, 21)):
    if n == 1:
        exp[i] = "Reward item id awarded at the 1st leaderboard tier (only used when Leaderboard ? = TRUE)"
    else:
        exp[i] = f"Reward item id awarded at the {n}{ord_suffix(n)} leaderboard tier"

# --- Leaderboard cumulative XP targets 1-20 (cols 62-81) ---
for i, n in zip(range(62, 82), range(1, 21)):
    if n == 1:
        exp[i] = "Cumulative XP needed to reach the 1st leaderboard tier (computed from XP Total and alpha xp)"
    else:
        exp[i] = f"Cumulative XP needed to reach the {n}{ord_suffix(n)} leaderboard tier"

# --- Gauge reward items 1-20 (cols 83-102) ---
for i, n in zip(range(83, 103), range(1, 21)):
    if n == 1:
        exp[i] = "Reward item id awarded at the 1st gauge milestone of the event. For multi-world Odysseys the 20 cells are read as 4 milestones x 5 worlds (slots 1-4 = W1, 5-8 = W2, ... 17-20 = W5)"
    else:
        exp[i] = f"Reward item id awarded at the {n}{ord_suffix(n)} gauge milestone"

# --- Gauge cumulative XP/HC targets 1-20 (cols 104-123) ---
for i, n in zip(range(104, 124), range(1, 21)):
    if n == 1:
        exp[i] = "Cumulative XP / HC target the player must reach to unlock the 1st gauge reward (per-world: targets reset each world)"
    else:
        exp[i] = f"Cumulative XP / HC target needed to unlock gauge reward #{n} (per-world: targets reset each world)"

# --- Difficulty: power per world (cols 125-129) ---
ord_map = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th"}
for i, w in zip(range(125, 130), range(1, 6)):
    exp[i] = f"Power offset applied to the {ord_map[w]} world of this event (positive = easier for the player, negative = harder). Feeds the difficulty / recommended-power formulas"

# --- Modifier (cols 131-132) ---
exp[131] = "id of the world modifier config applied to this event (e.g. wmc_boost_meadow_small, wmc_allow_common_boost_common). Modifiers are buffs (Pet rarity boost, Specific pet boost) or restrictions (Biome restriction)"
exp[132] = "Value / multiplier exposed by that modifier (e.g. 120%). #N/A if the modifier doesn't expose a tunable value"

# --- Player Behavior: list of rewards each persona expects to reach (cols 133-139) ---
persona_desc = {
    133: ("Light",   "30 min base playtime, ~5 min in event"),
    134: ("Normal",  "60 min base playtime, ~20 min in event (a.k.a. Regular)"),
    135: ("Engaged", "100 min base playtime, ~60 min in event (a.k.a. Invested)"),
    136: ("Elite",   "180 min base playtime, ~120 min in event"),
}
for col, (name, hint) in persona_desc.items():
    exp[col] = f"Comma-separated list of rewards we expect a {name} persona to reach during this event ({hint}). Used as the design target for tuning the gauge / leaderboard"

leaderboard_desc = {
    137: ("Bronze", "lowest leaderboard tier reached"),
    138: ("Silver", "mid leaderboard tier reached"),
    139: ("Gold",   "top leaderboard tier reached"),
}
for col, (name, hint) in leaderboard_desc.items():
    exp[col] = f"Comma-separated list of rewards we expect a player finishing in {name} ({hint}) to claim. Used to size the leaderboard payout block"

# --- Quests placeholders (cols 141-143) ---
for c in (141, 142, 143):
    exp[c] = "Quests block (placeholder column - fill if the event ships with quest objectives)"

# --- GENERATOR / WorldProgressConfig (cols 145-149) ---
exp[145] = "GENERATOR / WorldProgressConfig id : unique id of the progression_reward_gauge entry produced for this event"
exp[146] = "GENERATOR / final_currency_target : total amount of currency required to fully fill the gauge (last milestone target)"
exp[147] = "GENERATOR / currency_id : which currency the gauge tracks (typically currency.xp)"
exp[148] = "GENERATOR / rewards : reward item id granted at this milestone row"
exp[149] = "GENERATOR / reward_currency_target : currency value at which this specific milestone unlocks"

# --- GENERATOR / World Config (cols 151-160) ---
exp[151] = "GENERATOR / World Config id : reference of the world used by this event (e.g. meadow_TLE_config1)"
exp[152] = "GENERATOR / world_tile_config_id : tile layout config to use"
exp[153] = "GENERATOR / world_random_spawners_config_id : random spawner config (was renamed in 3.2: RandomSpawnersCycle -> WorldRandomSpawnersConfig)"
exp[154] = "GENERATOR / world_resource_config_id : resource availability config (e.g. meadow_resConfig1_hole_TLE)"
exp[155] = "GENERATOR / landmark_config_id : landmarks placement config"
exp[156] = "GENERATOR / world_enviro_config_id : environment / visual config"
exp[157] = "GENERATOR / world_resource_drop_config_id : resource drop rates config"
exp[158] = "GENERATOR / biome_ids : biome ids the world is built from (meadow, sea, savanna, forest, jungle)"
exp[159] = "GENERATOR / tile_count : number of tiles in the generated world"
exp[160] = "GENERATOR / world_modifier_config_id : modifier config applied to the world (matches the Modifier id column)"

# --- GENERATOR / WorldEvent (cols 162-178) ---
exp[162] = "GENERATOR / WorldEvent id : unique id of the generated WorldEvent (e.g. TLE_1_Meadow_1)"
exp[163] = "GENERATOR / world_config_id : reference to the World Config block above"
exp[164] = "GENERATOR / progression_config_id : reference to the WorldProgressConfig (gauge) used by this WorldEvent"
exp[165] = "GENERATOR / use_dynamic_world_coins : TRUE = scale coin rewards dynamically with the player's current MainWorld coin multiplier ; FALSE = use fixed values"
exp[166] = "GENERATOR / world_coins_multiplier : multiplier applied to coin rewards (offset added to the dynamic multiplier when use_dynamic_world_coins = TRUE)"
exp[167] = "GENERATOR / use_dynamic_world_progress_currency : TRUE = scale gauge currency dynamically with the player's MainWorld progress currency multiplier ; FALSE = fixed values"
exp[168] = "GENERATOR / world_progress_currency_multiplier : multiplier applied to gauge currency (offset added to the dynamic multiplier when use_dynamic_world_progress_currency = TRUE)"
exp[169] = "GENERATOR / game_page : screen the event is hosted on (e.g. WorldRushPage, EventPage)"
exp[170] = "GENERATOR / event_duration : duration in seconds (-1 = no automatic end, controlled by the schedule remote settings)"
exp[171] = "GENERATOR / use_dynamic_power : TRUE = compute world_recommended_power = bonus + teamPower + (additional_power x 6) at event start ; FALSE = use fixed world_power"
exp[172] = "GENERATOR / additional_power : extra power offset added on top of the dynamic baseline (matches the Difficulty Power columns)"
exp[173] = "GENERATOR / world_power : baseline world power used when use_dynamic_power = FALSE"
exp[174] = "GENERATOR / world_recommended_power : recommended power displayed to the player on the event card"
exp[175] = "GENERATOR / behavior : event behavior class (e.g. WorldRushBehavior)"
exp[176] = "GENERATOR / eventCardViewId : view id of the card shown in the events list (e.g. eventCard_bossRush_view)"
exp[177] = "GENERATOR / eventRulesViewId : view id of the rules popup"
exp[178] = "GENERATOR / eventPopupViewId : view id of the start / end popup"

# --- GENERATOR / eventContentList (cols 180-182) ---
exp[180] = "GENERATOR / eventContentList id : id of the parent event group this WorldEvent belongs to (e.g. TLE_1_Meadow). Same id is shared across the 5 WorldEvents of an Odyssey"
exp[181] = "GENERATOR / content_id : id of the WorldEvent included in the group (matches the WorldEvent id column). Leaderboard entries use the leaderboard id"
exp[182] = "GENERATOR / progression_order : order in which this WorldEvent is played within the group (1, 2, 3, 4, 5 for an Odyssey ; 0 for a leaderboard entry)"

# Make sure the explanation row has at least NCOL cells
while len(exp) < NCOL:
    exp.append("")

# Replace row index 3 (the existing explanation row, currently misaligned)
rows[3] = exp

# Pad / write back
with open(DST, "w", newline="") as f:
    w = csv.writer(f)
    w.writerows(rows)

filled = sum(1 for c in exp if c)
print(f"Updated row 4 with {filled}/{NCOL} explanation cells. Total rows: {len(rows)}")
