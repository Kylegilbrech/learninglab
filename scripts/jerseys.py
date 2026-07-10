#!/usr/bin/env python3
"""
Emit real jersey numbers for KEY (star) players -> www/js/jerseys.js, keyed by player id.

The player dataset has no jersey numbers, so these are curated by hand for widely
recognizable stars. Each entry is guarded by (name, team): if the team in the data does
not match the expected team, the number is skipped so a wrong number never ships. Every
other player keeps the deterministic stylized number from players.js.
"""
import json, os

BASE = os.path.dirname(__file__)
players = json.load(open(os.path.join(BASE, "players_2025.json")))

# (name, team): real jersey number — only confident, current-team stars.
KEY = {
    # ---- QB ----
    ("Josh Allen", "BUF"): 17, ("Patrick Mahomes", "KC"): 15, ("Jalen Hurts", "PHI"): 1,
    ("Joe Burrow", "CIN"): 9, ("Lamar Jackson", "BAL"): 8, ("Dak Prescott", "DAL"): 4,
    ("Jared Goff", "DET"): 16, ("Trevor Lawrence", "JAX"): 16, ("Justin Herbert", "LAC"): 10,
    ("Tua Tagovailoa", "MIA"): 1, ("C.J. Stroud", "HOU"): 7, ("Brock Purdy", "SF"): 13,
    ("Baker Mayfield", "TB"): 6, ("Caleb Williams", "CHI"): 18, ("Bo Nix", "DEN"): 10,
    ("Jordan Love", "GB"): 10, ("Matthew Stafford", "LAR"): 9, ("Drake Maye", "NE"): 10,
    ("Bryce Young", "CAR"): 9, ("Aaron Rodgers", "PIT"): 8, ("Sam Darnold", "SEA"): 14,
    ("Geno Smith", "LV"): 7, ("J.J. McCarthy", "MIN"): 9,
    # ---- RB ----
    ("Christian McCaffrey", "SF"): 23, ("Saquon Barkley", "PHI"): 26, ("Derrick Henry", "BAL"): 22,
    ("Jahmyr Gibbs", "DET"): 26, ("Jonathan Taylor", "IND"): 28, ("Bijan Robinson", "ATL"): 7,
    ("Josh Jacobs", "GB"): 8, ("James Cook", "BUF"): 4, ("Kyren Williams", "LAR"): 23,
    ("De'Von Achane", "MIA"): 28, ("Breece Hall", "NYJ"): 20, ("Alvin Kamara", "NO"): 41,
    ("Kenneth Walker III", "SEA"): 9, ("David Montgomery", "DET"): 5, ("Isiah Pacheco", "KC"): 10,
    ("Aaron Jones", "MIN"): 33, ("Nick Chubb", "HOU"): 24, ("Chuba Hubbard", "CAR"): 30,
    ("Tony Pollard", "TEN"): 20,
    # ---- WR ----
    ("Justin Jefferson", "MIN"): 18, ("Ja'Marr Chase", "CIN"): 1, ("CeeDee Lamb", "DAL"): 88,
    ("Puka Nacua", "LAR"): 17, ("A.J. Brown", "PHI"): 11, ("Amon-Ra St. Brown", "DET"): 14,
    ("Jaxon Smith-Njigba", "SEA"): 11, ("Mike Evans", "TB"): 13, ("Nico Collins", "HOU"): 12,
    ("Drake London", "ATL"): 5, ("Marvin Harrison Jr.", "ARI"): 18, ("DeVonta Smith", "PHI"): 6,
    ("DK Metcalf", "PIT"): 4, ("Terry McLaurin", "WAS"): 17, ("Tee Higgins", "CIN"): 5,
    ("Zay Flowers", "BAL"): 4, ("Jaylen Waddle", "MIA"): 17, ("Ladd McConkey", "LAC"): 15,
    ("Brian Thomas Jr.", "JAX"): 7, ("Rome Odunze", "CHI"): 15, ("Jordan Addison", "MIN"): 3,
    ("Chris Godwin Jr.", "TB"): 14,
    # ---- TE ----
    ("Travis Kelce", "KC"): 87, ("George Kittle", "SF"): 85, ("Mark Andrews", "BAL"): 89,
    ("Trey McBride", "ARI"): 85, ("Brock Bowers", "LV"): 89, ("Sam LaPorta", "DET"): 87,
    ("Kyle Pitts", "ATL"): 8, ("T.J. Hockenson", "MIN"): 87, ("David Njoku", "CLE"): 85,
    ("Dallas Goedert", "PHI"): 88,
    # ---- K ----
    ("Harrison Butker", "KC"): 7, ("Brandon Aubrey", "DAL"): 17, ("Jake Elliott", "PHI"): 4,
    ("Cameron Dicker", "LAC"): 11, ("Jason Myers", "SEA"): 5, ("Evan McPherson", "CIN"): 2,
    ("Chris Boswell", "PIT"): 9,
}

by_key = {(p["name"], p["team"]): p for p in players}
out = {}
matched, missed = [], []
for (name, team), num in KEY.items():
    p = by_key.get((name, team))
    if p:
        out[p["id"]] = num
        matched.append(f"{name} ({team}) #{num}")
    else:
        missed.append(f"{name} ({team})")

dst = os.path.join(BASE, "..", "www", "js", "jerseys.js")
with open(dst, "w") as f:
    f.write("// Real jersey numbers for key/star players (curated; guarded by team).\n")
    f.write("// Everyone else keeps the stylized number from players.js. Regenerate: scripts/jerseys.py\n")
    f.write("window.JERSEY_NUMBERS = ")
    f.write(json.dumps(out, separators=(",", ":")))
    f.write(";\n")

print(f"matched {len(matched)} key players -> {dst}")
if missed:
    print("\nUNMATCHED (check spelling/team, these fall back to stylized numbers):")
    for m in missed:
        print("   -", m)
