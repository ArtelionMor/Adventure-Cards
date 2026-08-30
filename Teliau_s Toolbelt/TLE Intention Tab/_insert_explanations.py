import csv, sys, io

SRC = "V3.2 SA - TLE intention(13).csv"
DST = "V3.2 SA - TLE intention(13).csv"

# Build the explanation row, indexed by column (0..138).
# Empty string = leave blank (separator columns or columns that already
# have a clear top-row group header / sub-header above them).
exp = [""] * 139

# --- Left-side global parameters block (cols 0-2) ---
exp[0] = "Tuning parameter name (left-hand list of global knobs that drive the Gauge / Difficulty / Reward formulas for every TLE)"
exp[1] = "Value used by the formulas for the parameter on its left (only the cells in this column are read by the generator)"
# col 2 is a visual separator, leave empty

# --- Event metadata (cols 3-7) ---
exp[3] = "Display name of the TLE event configured by this row (one row = one event setup, e.g. 'TLE 1 Meadow')"
exp[4] = "TRUE = (re)generate the WorldProgress / reward gauge for this event ; FALSE = reuse the existing one"
exp[5] = "How the gauge total reward is split across milestones. A single number (e.g. 4) = that many equal gauge milestones. A dash list (e.g. '4 - 2 - 4 - 3 - 5') = split between gauge milestones and leaderboard tiers"
exp[6] = "TRUE = this event has a competitive leaderboard on top of the gauge ; FALSE = gauge only"
# col 7 separator

# --- Gauge: alpha curve for HC (cols 8-12) ---
for i, w in zip(range(8, 13), range(1, 6)):
    exp[i] = f"alpha curve profile for the HC gauge in World {w} (controls how steep the HC progression feels: >1 front-loaded, <1 back-loaded)"

# --- Gauge: HC amount per world (cols 13-17) ---
for i, w in zip(range(13, 18), range(1, 6)):
    exp[i] = f"Total amount of HC available through the gauge in World {w} (sum of HC handed out across all gauge milestones for that world)"

# col 18 separator

# --- Gauge: alpha curve for XP (cols 19-23) ---
for i, w in zip(range(19, 24), range(1, 6)):
    exp[i] = f"alpha curve profile for the XP gauge in World {w} (same role as the HC alpha but applied to the XP progression curve)"

# --- Gauge: XP amount per world (cols 24-28) ---
for i, w in zip(range(24, 29), range(1, 6)):
    exp[i] = f"Total amount of XP required / distributed by the gauge in World {w}"

# col 29 separator

# --- XP multiplier per world (cols 30-34) ---
for i, w in zip(range(30, 35), range(1, 6)):
    exp[i] = f"XP multiplier applied on top of the base XP rewards in World {w} (1 = no boost, 2 = x2, etc.)"

# col 35 separator

# --- Reward totals (cols 36-37) ---
exp[36] = "Sum of the gem-equivalent value of all gauge rewards listed on this row (sanity check vs gauge HC budget)"
exp[37] = "Sum of the gem-equivalent value of all leaderboard rewards listed on this row (only filled when Leaderboard ? = TRUE)"

# col 38 separator

# --- Reward items 1-20 (cols 39-58) ---
for i, n in zip(range(39, 59), range(1, 21)):
    if n == 1:
        exp[i] = "Reward item id awarded at the 1st gauge milestone (first cells = gauge rewards, the trailing cells are leaderboard rewards when the event has one)"
    else:
        exp[i] = f"Reward item id awarded at the {n}{'st' if n==1 else 'nd' if n==2 else 'rd' if n==3 else 'th'} reward slot (gauge milestones first, then leaderboard tiers)"

# col 59 separator

# --- Target values 1-20 (cols 60-79) ---
for i, n in zip(range(60, 80), range(1, 21)):
    if n == 1:
        exp[i] = "Cumulative XP / HC target the player must reach to unlock the 1st reward (gauge milestone or leaderboard tier matching the column above)"
    else:
        exp[i] = f"Cumulative XP / HC target needed to unlock reward #{n}"

# col 80 separator

# --- Difficulty: power per world (cols 81-85) ---
ord_map = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th"}
for i, w in zip(range(81, 86), range(1, 6)):
    exp[i] = f"Power offset applied to the {ord_map[w]} world of this event (negative = easier than the player's current power, positive = harder). Feeds the difficulty / recommended-power formulas"

# col 86 separator

# --- Modifiers (cols 87-88) ---
exp[87] = "id of the world modifier config applied to this event (e.g. modifier_meadow_low)"
exp[88] = "Value / multiplier applied by that modifier (e.g. 120%). #N/A if the modifier doesn't expose a tunable value"

# --- Player Behavior (cols 89-95) ---
exp[89] = "Assumed share of Light players (used to estimate average gauge progression / rewards earned)"
exp[90] = "Assumed share of Normal players"
exp[91] = "Assumed share of Engaged players"
exp[92] = "Assumed share of Elite players"
exp[93] = "Assumed share of players reaching Bronze on the leaderboard"
exp[94] = "Assumed share of players reaching Silver on the leaderboard"
exp[95] = "Assumed share of players reaching Gold on the leaderboard"

# col 96 separator

# --- Quests (cols 97-100) ---
exp[97] = "Quests block (placeholder column — fill if the event ships with quest objectives)"
exp[98] = "Quests block (placeholder)"
exp[99] = "Quests block (placeholder)"
exp[100] = "Quests block (placeholder)"

# --- REWARD GAUGE: WorldProgressConfig (cols 101-105) ---
exp[101] = "GENERATOR / WorldProgressConfig id : unique id of the progression_reward_gauge entry produced for this event"
exp[102] = "GENERATOR / final_currency_target : total amount of currency required to fully fill the gauge (last milestone target)"
exp[103] = "GENERATOR / currency_id : which currency the gauge tracks (typically currency.xp)"
exp[104] = "GENERATOR / rewards : reward item id granted at this milestone row"
exp[105] = "GENERATOR / reward_currency_target : currency value at which this specific milestone unlocks"

# col 106 separator

# --- World Config (cols 107-116) ---
exp[107] = "GENERATOR / World Config id : reference of the world used by this event"
exp[108] = "GENERATOR / world_tile_config_id : tile layout config to use"
exp[109] = "GENERATOR / world_random_spawners_config_id : random spawner config"
exp[110] = "GENERATOR / world_resource_config_id : resource availability config"
exp[111] = "GENERATOR / landmark_config_id : landmarks placement config"
exp[112] = "GENERATOR / world_enviro_config_id : environment / visual config"
exp[113] = "GENERATOR / world_resource_drop_config_id : resource drop rates config"
exp[114] = "GENERATOR / biome_ids : biome ids the world is built from"
exp[115] = "GENERATOR / tile_count : number of tiles in the generated world"
exp[116] = "GENERATOR / world_modifier_config_id : modifier config applied to the world"

# col 117 separator

# --- WorldEvent (cols 118-134) ---
exp[118] = "GENERATOR / WorldEvent id : unique id of the generated WorldEvent (e.g. TLE_1_Meadow_1)"
exp[119] = "GENERATOR / world_config_id : reference to the World Config block above"
exp[120] = "GENERATOR / progression_config_id : reference to the WorldProgressConfig (gauge) used by this WorldEvent"
exp[121] = "GENERATOR / use_dynamic_world_coins : TRUE = scale coin rewards dynamically with the player ; FALSE = use fixed values"
exp[122] = "GENERATOR / world_coins_multiplier : multiplier applied to coin rewards (only used when use_dynamic_world_coins = TRUE)"
exp[123] = "GENERATOR / use_dynamic_world_progress_currency : TRUE = scale gauge currency dynamically ; FALSE = use fixed values"
exp[124] = "GENERATOR / world_progress_currency_multiplier : multiplier applied to gauge currency (only used when use_dynamic_world_progress_currency = TRUE)"
exp[125] = "GENERATOR / game_page : screen the event is hosted on (e.g. EventPage)"
exp[126] = "GENERATOR / event_duration : duration in seconds (-1 = no automatic end)"
exp[127] = "GENERATOR / use_dynamic_power : TRUE = compute the world power from the player level ; FALSE = use fixed world_power"
exp[128] = "GENERATOR / additional_power : extra power offset added on top (matches the Difficulty Power columns)"
exp[129] = "GENERATOR / world_power : baseline world power used when use_dynamic_power = FALSE"
exp[130] = "GENERATOR / world_recommended_power : recommended power displayed to the player"
exp[131] = "GENERATOR / behavior : event behavior class (e.g. WorldRushBehavior)"
exp[132] = "GENERATOR / eventCardViewId : view id of the card shown in the events list"
exp[133] = "GENERATOR / eventRulesViewId : view id of the rules popup"
exp[134] = "GENERATOR / eventPopupViewId : view id of the start / end popup"

# col 135 separator

# --- eventContentList (cols 136-138) ---
exp[136] = "GENERATOR / eventContentList id : id of the parent event group this WorldEvent belongs to (e.g. TLE_1_Meadow)"
exp[137] = "GENERATOR / content_id : id of the WorldEvent included in the group (matches the WorldEvent id column)"
exp[138] = "GENERATOR / progression_order : order in which this WorldEvent is played within the group (1, 2, 3, ...)"

# Read existing rows
with open(SRC, newline="") as f:
    rows = list(csv.reader(f))

# Insert explanation row at index 3 (i.e. above current row 4 which is the headers)
rows.insert(3, exp)

# Write back
with open(DST, "w", newline="") as f:
    w = csv.writer(f)
    w.writerows(rows)

print(f"Inserted explanation row. New total rows: {len(rows)}. Explanation columns filled: {sum(1 for c in exp if c)}/{len(exp)}")
