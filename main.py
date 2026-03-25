from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from sqlmodel import Session, select
from models import engine, Batting, People, Teams

app = FastAPI()

@app.get("/years")
async def get_years():
    with Session(engine) as session:
        years = session.exec(select(Teams.yearID).distinct().order_by(Teams.yearID)).all()
    return years

@app.get("/teams")
async def get_teams(year: int):
    with Session(engine) as session:
        teams = session.exec(
            select(Teams.teamID, Teams.name, Teams.lgID, Teams.divID)
            .where(Teams.yearID == year)
            .order_by(Teams.name)
        ).all()
    return [{"teamID": tid, "name": name, "league": lg, "division": div} for tid, name, lg, div in teams]




@app.get("/roster")
async def get_roster(year: int, team: str):
    with Session(engine) as session:
        players = session.exec(
            select(People.playerID, People.nameFirst, People.nameLast)
            .join(Batting, Batting.playerID == People.playerID)
            .where(Batting.yearID == year, Batting.teamID == team)
            .distinct()
            .order_by(People.nameLast, People.nameFirst)
        ).all()
    return [{"playerID": pid, "first": first, "last": last} for pid, first, last in players]


@app.get("/player")
async def get_player(id: str):
    with Session(engine) as session:
        person = session.get(People, id)
        if not person:
            return {"error": "Player not found"}

        bio = {
            "playerID": person.playerID,
            "nameFirst": person.nameFirst,
            "nameLast": person.nameLast,
            "nameGiven": person.nameGiven,
            "birthYear": person.birthYear,
            "birthMonth": person.birthMonth,
            "birthDay": person.birthDay,
            "birthCity": person.birthCity,
            "birthState": person.birthState,
            "birthCountry": person.birthCountry,
            "deathYear": person.deathYear,
            "deathMonth": person.deathMonth,
            "deathDay": person.deathDay,
            "weight": person.weight,
            "height": person.height,
            "bats": person.bats,
            "throws": person.throws,
            "debut": person.debut,
            "finalGame": person.finalGame,
        }

        rows = session.exec(
            select(Batting, Teams.name)
            .join(Teams, (Batting.yearID == Teams.yearID) & (Batting.teamID == Teams.teamID))
            .where(Batting.playerID == id)
            .order_by(Batting.yearID, Batting.stint)
        ).all()

        batting = [
            {
                "yearID": b.yearID,
                "teamID": b.teamID,
                "teamName": team_name,
                "stint": b.stint,
                "G": b.G,
                "AB": b.AB,
                "R": b.R,
                "H": b.H,
                "2B": b.doubles,
                "3B": b.triples,
                "HR": b.HR,
                "RBI": b.RBI,
                "SB": b.SB,
                "CS": b.CS,
                "BB": b.BB,
                "SO": b.SO,
                "IBB": b.IBB,
                "HBP": b.HBP,
                "SH": b.SH,
                "SF": b.SF,
                "GIDP": b.GIDP,
            }
            for b, team_name in rows
        ]

    return {"bio": bio, "batting": batting}


app.mount("/", StaticFiles(directory="static", html=True), name="static")