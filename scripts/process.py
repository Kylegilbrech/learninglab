#!/usr/bin/env python3
"""
Process real 2025 NFL season data (source: hvpkod/NFL-Data, extracted from Fantasy.NFL.com)
into a clean player pool with fantasy points (PPR per the project blueprint) and FPL-style prices.

DOCUMENTED ASSUMPTIONS (per user's "use best assumptions and document them" instruction):
  * Scoring = PPR baseline from the blueprint:
      Passing: 1 pt / 25 yds, TD +4, INT -2
      Rush/Rec: 1 pt / 10 yds, TD +6, Reception +1 (PPR)
      Return/Fumble-recovery TD +6, 2PT +2, Fumble lost -2
      Kicker: PAT +1 (missed -1); FG <40 +3, 40-49 +4, 50+ +5; missed FG -1
      DST (APPROXIMATION): Sack +1, INT +2, FumRec +2, Def TD +6, Safety +2.
        NOTE: team "points allowed" is NOT in this dataset, so DST omits the points-allowed
        tier. DST is therefore an approximation built by aggregating individual defenders
        (DB+DL+LB) per team. Flagged in the app.
  * "Fum" column treated as fumbles LOST (-2 each).
  * Player pool trimmed to fantasy-relevant depth per position to keep the UI clean.
  * Prices derived by scaling each player's season fantasy points within position-specific
    floor/ceiling bands (FPL-style). This makes the $100.0m cap force real trade-offs.
"""
import pandas as pd, numpy as np, json, os

BASE = "/home/claude/nfl/NFL-Data-main/NFL-data-Players/2025"

def col(df, name):
    """Return numeric column or zeros if missing."""
    if name in df.columns:
        return pd.to_numeric(df[name], errors="coerce").fillna(0.0)
    return pd.Series(np.zeros(len(df)), index=df.index)

# ---------- OFFENSE ----------
def load_offense(pos):
    df = pd.read_csv(f"{BASE}/{pos}_season.csv")
    df = df[df["PlayerName"].notna() & (df["PlayerName"].astype(str).str.strip() != "")]
    pts = (
        col(df,"PassingYDS")/25.0 + col(df,"PassingTD")*4 - col(df,"PassingInt")*2
        + col(df,"RushingYDS")/10.0 + col(df,"RushingTD")*6
        + col(df,"ReceivingYDS")/10.0 + col(df,"ReceivingTD")*6 + col(df,"ReceivingRec")*1
        + col(df,"RetTD")*6 + col(df,"FumTD")*6 + col(df,"2PT")*2 - col(df,"Fum")*2
    )
    out = pd.DataFrame({
        "id": df["PlayerId"].astype(str),
        "name": df["PlayerName"].astype(str).str.strip(),
        "pos": pos,
        "team": df["Team"].astype(str).str.strip(),
        "pts": pts.round(1),
    })
    return out

# ---------- KICKER ----------
def load_kicker():
    df = pd.read_csv(f"{BASE}/K_season.csv")
    df = df[df["PlayerName"].notna() & (df["PlayerName"].astype(str).str.strip() != "")]
    fg_lt40 = col(df,"FgMade_0-19")+col(df,"FgMade_20-29")+col(df,"FgMade_30-39")
    misses = col(df,"FgMiss_0-19")+col(df,"FgMiss_20-29")+col(df,"FgMiss_30-39")
    pts = (col(df,"PatMade")*1 - col(df,"PatMissed")*1
           + fg_lt40*3 + col(df,"FgMade_40-49")*4 + col(df,"FgMade_50")*5 - misses*1)
    return pd.DataFrame({
        "id": df["PlayerId"].astype(str),
        "name": df["PlayerName"].astype(str).str.strip(),
        "pos": "K",
        "team": df["Team"].astype(str).str.strip(),
        "pts": pts.round(1),
    })

# ---------- DST (approximation: aggregate IDP per team) ----------
TEAM_NAMES = {
 "ARI":"Cardinals","ATL":"Falcons","BAL":"Ravens","BUF":"Bills","CAR":"Panthers","CHI":"Bears",
 "CIN":"Bengals","CLE":"Browns","DAL":"Cowboys","DEN":"Broncos","DET":"Lions","GB":"Packers",
 "HOU":"Texans","IND":"Colts","JAX":"Jaguars","KC":"Chiefs","LAC":"Chargers","LAR":"Rams",
 "LV":"Raiders","MIA":"Dolphins","MIN":"Vikings","NE":"Patriots","NO":"Saints","NYG":"Giants",
 "NYJ":"Jets","PHI":"Eagles","PIT":"Steelers","SEA":"Seahawks","SF":"49ers","TB":"Buccaneers",
 "TEN":"Titans","WAS":"Commanders",
}
def load_dst():
    frames = []
    for pos in ["DB","DL","LB"]:
        d = pd.read_csv(f"{BASE}/{pos}_season.csv")
        frames.append(d)
    d = pd.concat(frames, ignore_index=True)
    d = d[d["Team"].notna()]
    d["team"] = d["Team"].astype(str).str.strip()
    g = d.groupby("team").apply(lambda x: pd.Series({
        "sacks": col(x,"TacklesSck").sum(),
        "int":   col(x,"TurnoverInt").sum(),
        "fumrec":col(x,"TurnoverFumRec").sum(),
        "deftd": col(x,"ScoreIntTd").sum()+col(x,"ScoreFumTd").sum()+col(x,"ScoreBlkTd").sum(),
        "saf":   col(x,"ScoreSaf").sum(),
    }), include_groups=False).reset_index()
    g["pts"] = (g["sacks"]*1 + g["int"]*2 + g["fumrec"]*2 + g["deftd"]*6 + g["saf"]*2).round(1)
    g = g[g["team"].isin(TEAM_NAMES.keys())]
    return pd.DataFrame({
        "id": ("DST_"+g["team"]),
        "name": g["team"].map(TEAM_NAMES)+" D/ST",
        "pos": "DST",
        "team": g["team"],
        "pts": g["pts"],
    })

# ---------- PRICING ----------
# Position price bands (floor, ceiling) in $m, FPL-style.
BANDS = {"QB":(4.5,12.0),"RB":(4.5,13.0),"WR":(4.5,13.0),"TE":(4.0,11.0),"K":(4.0,6.0),"DST":(4.0,7.0)}
# Pool depth per position (keep fantasy-relevant players).
DEPTH = {"QB":32,"RB":64,"WR":80,"TE":36,"K":24,"DST":32}

def price_and_trim(df, pos):
    df = df.sort_values("pts", ascending=False).head(DEPTH[pos]).copy()
    lo, hi = BANDS[pos]
    pmin, pmax = df["pts"].min(), df["pts"].max()
    if pmax == pmin:
        df["price"] = round((lo+hi)/2,1)
    else:
        scaled = lo + (hi-lo)*(df["pts"]-pmin)/(pmax-pmin)
        df["price"] = (np.round(scaled*10)/10).round(1)
    return df

def main():
    parts = [load_offense(p) for p in ["QB","RB","WR","TE"]] + [load_kicker(), load_dst()]
    allpos = {p:None for p in DEPTH}
    final = []
    for df in parts:
        pos = df["pos"].iloc[0]
        final.append(price_and_trim(df, pos))
    players = pd.concat(final, ignore_index=True)
    players = players[["id","name","pos","team","pts","price"]]
    players["pts"] = players["pts"].astype(float)
    players["price"] = players["price"].astype(float)

    # ---------- VERIFICATION (math checked) ----------
    print("="*60); print("VERIFICATION"); print("="*60)
    print("Players by position:")
    print(players.groupby("pos").size().to_dict())
    print(f"Total players: {len(players)}")
    # 1) price ranges within bands
    ok = True
    for pos,(lo,hi) in BANDS.items():
        sub = players[players.pos==pos]
        if len(sub):
            assert sub.price.min() >= lo-1e-9 and sub.price.max() <= hi+1e-9, f"price out of band {pos}"
    print("[OK] all prices within position bands")
    # 2) cheapest valid 15-man squad must fit under 100
    req = {"QB":2,"RB":4,"WR":5,"TE":2,"K":1,"DST":1}
    cheapest = sum(players[players.pos==p].nsmallest(n,"price").price.sum() for p,n in req.items())
    priciest = sum(players[players.pos==p].nlargest(n,"price").price.sum() for p,n in req.items())
    print(f"[CHECK] squad size = {sum(req.values())} (should be 15)")
    print(f"[CHECK] cheapest valid squad = ${cheapest:.1f}m (must be < 100 -> playable)")
    print(f"[CHECK] priciest 'dream' squad = ${priciest:.1f}m (should be > 100 -> forces trade-offs)")
    assert sum(req.values())==15
    assert cheapest < 100.0
    assert priciest > 100.0
    print("[OK] budget tension confirmed")
    # 3) no NaNs
    assert players.isna().sum().sum()==0, "NaNs present"
    print("[OK] no missing values")
    # 4) spot-check Josh Allen points by hand:
    #    pass 3668/25=146.72, passTD 25*4=100, INT 10*-2=-20, rush 579/10=57.9,
    #    rushTD 14*6=84, fum 7*-2=-14  => 146.72+100-20+57.9+84-14 = 354.62
    ja = players[(players.name=="Josh Allen")&(players.pos=="QB")]
    if len(ja):
        print(f"[SPOT] Josh Allen computed = {ja.pts.iloc[0]:.2f} (hand-calc = 354.62)")
    # top of each position
    for pos in DEPTH:
        t = players[players.pos==pos].nlargest(3,"pts")[["name","team","pts","price"]]
        print(f"\nTop {pos}:")
        for _,r in t.iterrows():
            print(f"   {r['name']:<24} {r['team']:<4} {r['pts']:>6.1f} pts  ${r['price']:.1f}m")

    players.to_json("/home/claude/players_2025.json", orient="records")
    print(f"\nWrote players_2025.json ({len(players)} players)")

if __name__ == "__main__":
    main()
