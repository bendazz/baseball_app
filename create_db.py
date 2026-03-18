import pandas as pd
import sqlite3

DB_PATH = "baseball.db"

# Read CSVs
people = pd.read_csv("people.csv")
teams = pd.read_csv("teams.csv")
batting = pd.read_csv("batting.csv")

# Drop the surrogate 'ID' column from people — playerID is the real PK
people = people.drop(columns=["ID"])

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON")
cur = conn.cursor()

# --- coerce float columns that are really integers (whole numbers + NaN) ---
def coerce_float_to_int(df):
    for col in df.columns:
        if pd.api.types.is_float_dtype(df[col]):
            non_null = df[col].dropna()
            if len(non_null) > 0 and (non_null == non_null.astype(int)).all():
                df[col] = df[col].astype(pd.Int64Dtype())
    return df

people = coerce_float_to_int(people)
teams = coerce_float_to_int(teams)
batting = coerce_float_to_int(batting)

# --- helper to map pandas dtypes to SQLite column types ---
def sqlite_type(dtype):
    if pd.api.types.is_integer_dtype(dtype):
        return "INTEGER"
    elif pd.api.types.is_float_dtype(dtype):
        return "REAL"
    else:
        return "TEXT"

# --- people table ---
cols = ", ".join(
    f'"{c}" {sqlite_type(people[c])}' for c in people.columns
)
cur.execute(f'CREATE TABLE people ({cols}, PRIMARY KEY ("playerID"))')

# --- teams table ---
cols = ", ".join(
    f'"{c}" {sqlite_type(teams[c])}' for c in teams.columns
)
cur.execute(
    f'CREATE TABLE teams ({cols}, PRIMARY KEY ("teamID", "yearID"))'
)

# --- batting table ---
cols = ", ".join(
    f'"{c}" {sqlite_type(batting[c])}' for c in batting.columns
)
cur.execute(
    f"""CREATE TABLE batting (
        {cols},
        PRIMARY KEY ("playerID", "yearID", "stint"),
        FOREIGN KEY ("playerID") REFERENCES people ("playerID"),
        FOREIGN KEY ("yearID", "teamID") REFERENCES teams ("yearID", "teamID")
    )"""
)

# --- insert data ---
people.to_sql("people", conn, if_exists="append", index=False)
teams.to_sql("teams", conn, if_exists="append", index=False)
batting.to_sql("batting", conn, if_exists="append", index=False)

conn.commit()
conn.close()
print("baseball.db created successfully.")
