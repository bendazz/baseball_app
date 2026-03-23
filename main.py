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
            select(People.nameFirst, People.nameLast)
            .join(Batting, Batting.playerID == People.playerID)
            .where(Batting.yearID == year, Batting.teamID == team)
            .distinct()
            .order_by(People.nameLast, People.nameFirst)
        ).all()
    return [{"first": first, "last": last} for first, last in players]


app.mount("/", StaticFiles(directory="static", html=True), name="static")