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
            select(Teams.name, Teams.lgID, Teams.divID)
            .where(Teams.yearID == year)
            .order_by(Teams.name)
        ).all()
    return [{"name": name, "league": lg, "division": div} for name, lg, div in teams]





app.mount("/", StaticFiles(directory="static", html=True), name="static")